use super::core::{
    calculate_dir_size, expand_tilde, is_inside_dependency_directory, should_skip_directory,
};
use super::types::{get_all_dependency_directory_names, get_target_directory_names};
use crate::commands::settings::get_settings_sync;
use crate::config;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Instant;
use tracing::{debug, info, instrument};

#[instrument(skip_all)]
pub fn calculate_total_dependency_size() -> u64 {
    let start = Instant::now();
    info!("Starting background size calculation");

    let settings = get_settings_sync().unwrap_or_default();
    let root_directory = expand_tilde(&settings.root_directory);
    let target_dir_names = get_target_directory_names(&settings.enabled_categories);
    let all_dependency_dirs = get_all_dependency_directory_names();

    debug!(
        %root_directory,
        categories = ?settings.enabled_categories,
        "Scanning root directory"
    );

    let total_size = AtomicU64::new(0);
    let mut directories_found: usize = 0;

    for directory_entry in jwalk::WalkDir::new(&root_directory)
        .max_depth(config::scanner::MAX_SCAN_DEPTH)
        .skip_hidden(false)
        .follow_links(false)
        .parallelism(jwalk::Parallelism::RayonDefaultPool {
            busy_timeout: config::scanner::JWALK_BUSY_TIMEOUT,
        })
        .process_read_dir(|_, _, _, children| {
            children.retain(|entry_result| {
                if let Ok(ref entry) = entry_result {
                    let name = entry.file_name();
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
        .into_iter()
        .flatten()
    {
        if !directory_entry.file_type().is_dir() {
            continue;
        }

        let directory_name = directory_entry.file_name().to_str().unwrap_or("");

        if !target_dir_names.contains(directory_name) {
            continue;
        }

        let path = directory_entry.path();
        let path_string = path.to_string_lossy();

        if is_inside_dependency_directory(&path_string, directory_name, &all_dependency_dirs) {
            continue;
        }

        let size = calculate_dir_size(&path);
        total_size.fetch_add(size, Ordering::Relaxed);
        directories_found += 1;
    }

    let result = total_size.load(Ordering::Relaxed);
    info!(
        directories = directories_found,
        total_size_gb = result as f64 / 1024.0 / 1024.0 / 1024.0,
        duration_ms = start.elapsed().as_millis() as u64,
        "Background scan complete"
    );

    result
}

#[cfg(test)]
#[path = "background.test.rs"]
mod tests;
