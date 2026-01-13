use crate::commands::settings::get_settings_sync;
use crate::config;
use crate::scanner::{
    calculate_dir_size_full, expand_tilde, get_all_dependency_directory_names,
    get_target_directory_names, is_inside_dependency_directory, parse_exclude_patterns,
    should_exclude_path, should_skip_directory, DependencyCategory, DirectoryEntry,
    DiscoveredDirectory, ScanResult, ScanStats, SizeCalculatorPool,
};
use std::path::Path;
use std::sync::{Arc, LazyLock, Mutex};
#[cfg(test)]
use std::time::UNIX_EPOCH;
use std::time::{Duration, Instant};
use tauri::Emitter;
use tokio::sync::Notify;
use tokio_util::sync::CancellationToken;
use tracing::{debug, error, info, instrument, warn};

#[cfg(test)]
fn get_last_modified_ms(path: &Path) -> u64 {
    path.metadata()
        .and_then(|metadata| metadata.modified())
        .map(|modified| {
            modified
                .duration_since(UNIX_EPOCH)
                .map(|duration| duration.as_millis() as u64)
                .unwrap_or(0)
        })
        .unwrap_or(0)
}

fn determine_category(
    directory_name: &str,
    path: &Path,
    enabled_categories: &std::collections::HashSet<DependencyCategory>,
) -> Option<DependencyCategory> {
    match DependencyCategory::from_directory_name(directory_name) {
        Some(matched_category) => Some(matched_category),
        None if directory_name == "vendor" => {
            let vendor_category = DependencyCategory::from_vendor_directory(path)?;
            if enabled_categories.contains(&vendor_category) {
                Some(vendor_category)
            } else {
                None
            }
        }
        None if directory_name == "deps" => {
            let deps_category = DependencyCategory::from_deps_directory(path)?;
            if enabled_categories.contains(&deps_category) {
                Some(deps_category)
            } else {
                None
            }
        }
        None if directory_name == "pkg" => {
            let pkg_category = DependencyCategory::from_pkg_directory(path)?;
            if enabled_categories.contains(&pkg_category) {
                Some(pkg_category)
            } else {
                None
            }
        }
        None => None,
    }
}

fn maybe_emit_scan_stats(
    app: &tauri::AppHandle,
    last_emit_time: &mut Instant,
    running_total_size: u64,
    entry_count: usize,
    current_path: &str,
) {
    if last_emit_time.elapsed() >= config::scanner::EMIT_THROTTLE {
        let _ = app.emit(
            "scan_stats",
            ScanStats {
                total_size: running_total_size,
                directory_count: entry_count,
                current_path: Some(current_path.to_string()),
            },
        );
        *last_emit_time = Instant::now();
    }
}

struct ScanConfig {
    root_directory: String,
    enabled_categories: std::collections::HashSet<DependencyCategory>,
    target_dir_names: std::collections::HashSet<&'static str>,
    all_dependency_dirs: std::collections::HashSet<&'static str>,
    exclude_patterns: Vec<String>,
}

struct DiscoveryProgress {
    discovered: Vec<DiscoveredDirectory>,
    total_skipped: usize,
    last_emit_time: Instant,
}

impl DiscoveryProgress {
    fn new() -> Self {
        Self {
            discovered: Vec::new(),
            total_skipped: 0,
            last_emit_time: Instant::now()
                .checked_sub(Duration::from_millis(100))
                .unwrap_or_else(Instant::now),
        }
    }
}

fn discover_dependency_directory(
    directory_entry: &jwalk::DirEntry<((), ())>,
    config: &ScanConfig,
    progress: &mut DiscoveryProgress,
    app: &tauri::AppHandle,
) -> Option<DiscoveredDirectory> {
    if !directory_entry.file_type().is_dir() {
        return None;
    }

    let path = directory_entry.path();
    let path_string = path.to_string_lossy().to_string();

    maybe_emit_scan_stats(
        app,
        &mut progress.last_emit_time,
        0,
        progress.discovered.len(),
        &path_string,
    );

    let directory_name = directory_entry.file_name().to_str().unwrap_or("");

    if !config.target_dir_names.contains(directory_name) {
        return None;
    }

    let category = determine_category(directory_name, &path, &config.enabled_categories)?;

    if is_inside_dependency_directory(&path_string, directory_name, &config.all_dependency_dirs) {
        return None;
    }

    if should_exclude_path(&path_string, &config.exclude_patterns) {
        debug!(path = %path_string, "Skipping excluded path");
        return None;
    }

    debug!(path = %path_string, category = ?category, "Discovered dependency directory");

    Some(DiscoveredDirectory {
        path: path_string,
        category,
    })
}

fn execute_directory_walk(
    config: &ScanConfig,
    token: &CancellationToken,
    app: &tauri::AppHandle,
) -> Option<ScanResult> {
    let start = Instant::now();
    let mut progress = DiscoveryProgress::new();

    let num_threads = num_cpus::get().min(config::scanner::SIZE_POOL_THREADS);
    debug!(
        cpus = num_cpus::get(),
        threads = num_threads,
        "Starting discovery phase"
    );

    for entry in jwalk::WalkDir::new(&config.root_directory)
        .max_depth(config::scanner::MAX_SCAN_DEPTH)
        .skip_hidden(false)
        .follow_links(false)
        .parallelism(jwalk::Parallelism::RayonDefaultPool {
            busy_timeout: config::scanner::JWALK_BUSY_TIMEOUT,
        })
        .process_read_dir(|_, _, _, children| {
            children.retain(|directory_entry_result| {
                if let Ok(ref directory_entry) = directory_entry_result {
                    let name = directory_entry.file_name();
                    if let Some(name_string) = name.to_str() {
                        !should_skip_directory(name_string)
                    } else {
                        true
                    }
                } else {
                    true
                }
            });
        })
    {
        if token.is_cancelled() {
            debug!(
                discovered = progress.discovered.len(),
                "Discovery cancelled"
            );
            return None;
        }

        match entry {
            Ok(directory_entry) => {
                if let Some(discovered) =
                    discover_dependency_directory(&directory_entry, config, &mut progress, app)
                {
                    progress.discovered.push(discovered);
                }
            }
            Err(_) => {
                progress.total_skipped += 1;
            }
        }
    }

    let discovery_time = start.elapsed().as_millis();
    let discovered_count = progress.discovered.len();

    info!(
        discovered = discovered_count,
        skipped = progress.total_skipped,
        discovery_time_ms = discovery_time,
        "Discovery phase complete, starting size calculations"
    );

    if token.is_cancelled() {
        debug!("Scan cancelled after discovery");
        return None;
    }

    let mut pool = match SizeCalculatorPool::new(num_threads) {
        Ok(pool) => pool,
        Err(error) => {
            error!(%error, "Failed to create size calculator pool");
            return None;
        }
    };

    for discovered in &progress.discovered {
        if token.is_cancelled() {
            break;
        }
        pool.submit(discovered.path.clone(), discovered.category);
    }

    let mut all_entries: Vec<DirectoryEntry> = Vec::with_capacity(discovered_count);
    let mut running_total_size: u64 = 0;
    let results_receiver = pool.results();
    let mut results_collected: usize = 0;
    let mut timeouts: usize = 0;

    while results_collected < discovered_count {
        if token.is_cancelled() {
            debug!(collected = all_entries.len(), "Size calculation cancelled");
            pool.shutdown();
            return None;
        }

        match results_receiver.recv_timeout(Duration::from_secs(30)) {
            Ok(result) => {
                results_collected += 1;
                timeouts = 0;

                let entry = DirectoryEntry {
                    path: result.path.clone(),
                    size_bytes: result.total_size,
                    file_count: result.file_count,
                    last_modified_ms: result.last_modified_ms,
                    category: result.category,
                    has_only_symlinks: result.has_only_symlinks,
                };

                debug!(
                    path = %result.path,
                    size_bytes = result.total_size,
                    size_mb = result.total_size as f64 / 1024.0 / 1024.0,
                    file_count = result.file_count,
                    "Size calculation complete"
                );

                info!(
                    path = %result.path,
                    size_bytes = result.total_size,
                    file_count = result.file_count,
                    "Emitting scan_entry"
                );

                let _ = app.emit("scan_entry", &entry);
                running_total_size += entry.size_bytes;
                all_entries.push(entry);
            }
            Err(_) => {
                timeouts += 1;
                warn!(
                    timeouts = timeouts,
                    collected = results_collected,
                    expected = discovered_count,
                    "Timeout waiting for size calculation result"
                );
                if timeouts >= config::scanner::MAX_TIMEOUT_RETRIES {
                    warn!("Too many timeouts, stopping size collection");
                    break;
                }
            }
        }
    }

    pool.shutdown();
    drop(pool);

    let scan_time_ms = start.elapsed().as_millis();

    info!(
        entries = all_entries.len(),
        total_size_gb = running_total_size as f64 / 1024.0 / 1024.0 / 1024.0,
        duration_ms = scan_time_ms,
        discovery_ms = discovery_time,
        sizing_ms = scan_time_ms - discovery_time,
        skipped = progress.total_skipped,
        "Scan complete"
    );

    let sort_start = Instant::now();
    all_entries.sort_by(|first, second| second.size_bytes.cmp(&first.size_bytes));
    debug!(
        duration_ms = sort_start.elapsed().as_millis(),
        "Sort completed"
    );

    Some(ScanResult {
        entries: all_entries,
        total_size: running_total_size,
        scan_time_ms,
        skipped_count: progress.total_skipped,
    })
}

async fn cancel_previous_scan() -> Option<Arc<Notify>> {
    let previous_notify = {
        let mut state = SCAN_STATE.lock().unwrap();
        if let Some(token) = state.token.take() {
            debug!("Cancelling previous scan");
            token.cancel();
        }
        state.completion_notify.take()
    };

    if let Some(notify) = previous_notify {
        debug!("Waiting for previous scan to complete");
        tokio::time::timeout(config::scanner::PREVIOUS_SCAN_TIMEOUT, notify.notified())
            .await
            .ok();
        debug!("Previous scan completed or timed out");
    }

    None
}

fn register_new_scan(token: CancellationToken, completion_notify: Arc<Notify>) {
    let mut state = SCAN_STATE.lock().unwrap();
    state.token = Some(token);
    state.completion_notify = Some(completion_notify);
}

struct ScanState {
    token: Option<CancellationToken>,
    completion_notify: Option<Arc<Notify>>,
}

static SCAN_STATE: LazyLock<Mutex<ScanState>> = LazyLock::new(|| {
    Mutex::new(ScanState {
        token: None,
        completion_notify: None,
    })
});

#[tauri::command]
#[instrument(skip_all)]
pub async fn start_scan(app: tauri::AppHandle) -> Result<(), String> {
    let command_start = Instant::now();
    info!("Starting scan");

    cancel_previous_scan().await;

    let token = CancellationToken::new();
    let completion_notify = Arc::new(Notify::new());
    register_new_scan(token.clone(), completion_notify.clone());

    let settings = get_settings_sync().unwrap_or_default();
    let config = ScanConfig {
        root_directory: expand_tilde(&settings.root_directory),
        enabled_categories: settings.enabled_categories.clone(),
        target_dir_names: get_target_directory_names(&settings.enabled_categories),
        all_dependency_dirs: get_all_dependency_directory_names(),
        exclude_patterns: parse_exclude_patterns(&settings.exclude_paths),
    };

    info!(
        root_directory = %config.root_directory,
        categories = ?config.enabled_categories,
        exclude_patterns = ?config.exclude_patterns,
        "Starting directory scan"
    );

    tokio::task::spawn(async move {
        let app_for_emit = app.clone();
        let result =
            tokio::task::spawn_blocking(move || execute_directory_walk(&config, &token, &app))
                .await;

        if let Ok(Some(scan_result)) = result {
            info!(
                entries = scan_result.entries.len(),
                "Emitting scan_complete"
            );
            let _ = app_for_emit.emit("scan_complete", scan_result);
        } else if let Ok(None) = result {
            info!("Emitting scan_cancelled");
            let _ = app_for_emit.emit("scan_cancelled", ());
        }

        completion_notify.notify_waiters();
        debug!("Scan completion notified");
    });

    debug!(
        duration_ms = command_start.elapsed().as_millis(),
        "start_scan returned"
    );
    Ok(())
}

#[tauri::command]
#[instrument(skip_all)]
pub fn cancel_scan() {
    info!("Cancel scan requested");
    let mut state = SCAN_STATE.lock().unwrap();
    if let Some(token) = state.token.take() {
        token.cancel();
        debug!("Scan token cancelled");
    } else {
        warn!("No active scan to cancel");
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RescanResult {
    pub exists: bool,
    pub entry: Option<DirectoryEntry>,
}

#[tauri::command]
#[instrument(skip_all, fields(path = %path))]
pub async fn rescan_directory(path: String) -> Result<RescanResult, String> {
    info!(%path, "Rescanning directory");
    let start = Instant::now();

    let path_ref = Path::new(&path);

    if !path_ref.exists() {
        info!(%path, "Directory no longer exists");
        return Ok(RescanResult {
            exists: false,
            entry: None,
        });
    }

    if !path_ref.is_dir() {
        info!(%path, "Path is not a directory");
        return Ok(RescanResult {
            exists: false,
            entry: None,
        });
    }

    let directory_name = path_ref
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "Invalid directory name".to_string())?;

    let category = match directory_name {
        "vendor" => DependencyCategory::from_vendor_directory(path_ref)
            .ok_or_else(|| format!("Unknown vendor type for: {directory_name}"))?,
        "deps" => DependencyCategory::from_deps_directory(path_ref)
            .ok_or_else(|| format!("Not an Elixir deps directory: {directory_name}"))?,
        "pkg" => DependencyCategory::from_pkg_directory(path_ref)
            .ok_or_else(|| format!("Not a Go pkg directory: {directory_name}"))?,
        _ => DependencyCategory::from_directory_name(directory_name)
            .ok_or_else(|| format!("Unknown dependency category for: {directory_name}"))?,
    };

    let path_clone = path.clone();
    let size_result =
        tokio::task::spawn_blocking(move || calculate_dir_size_full(Path::new(&path_clone)))
            .await
            .map_err(|error| format!("Failed to calculate size: {error}"))?;

    let entry = DirectoryEntry {
        path,
        size_bytes: size_result.total_size,
        file_count: size_result.file_count,
        last_modified_ms: size_result.last_modified_ms,
        category,
        has_only_symlinks: size_result.has_only_symlinks,
    };

    info!(
        path = %entry.path,
        size_bytes = size_result.total_size,
        file_count = size_result.file_count,
        duration_ms = start.elapsed().as_millis(),
        "Rescan complete"
    );

    Ok(RescanResult {
        exists: true,
        entry: Some(entry),
    })
}

#[cfg(test)]
#[path = "scan.test.rs"]
mod tests;
