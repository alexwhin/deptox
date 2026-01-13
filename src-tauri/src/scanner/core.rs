use std::collections::HashSet;
use std::fs;
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::LazyLock;

/// Directories to skip during scanning (system/cache directories that shouldn't contain user projects)
static SKIP_DIRECTORIES: LazyLock<HashSet<&'static str>> = LazyLock::new(|| {
    HashSet::from([
        ".git",
        ".cache",
        ".config",
        "Library",
        ".Trash",
        "Applications",
        ".npm",
        ".cargo",
        ".cursor",
        ".vscode",
        "OrbStack",
        ".volta",
        ".nvm",
        ".fnm",
        ".asdf",
        ".mise",
        ".pyenv",
        ".rbenv",
        ".rustup",
        ".local",
        "Music",
        "Pictures",
        "Movies",
        "Photos Library.photoslibrary",
    ])
});

/// Creates a configured jwalk WalkDir builder with standard settings
fn create_walker(path: &Path) -> jwalk::WalkDir {
    jwalk::WalkDir::new(path)
        .skip_hidden(false)
        .follow_links(false)
        .parallelism(jwalk::Parallelism::Serial)
}

/// Calculates the total size of a directory in bytes
pub fn calculate_dir_size(path: &Path) -> u64 {
    let total_size = AtomicU64::new(0);

    create_walker(path)
        .into_iter()
        .filter_map(Result::ok)
        .for_each(|entry| {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_file() {
                    total_size.fetch_add(metadata.len(), Ordering::Relaxed);
                }
            }
        });

    total_size.load(Ordering::Relaxed)
}

/// Result of calculating directory size with additional metadata
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DirectorySizeResult {
    pub total_size: u64,
    pub file_count: usize,
    pub has_only_symlinks: bool,
    /// Most recent modification time in milliseconds since Unix epoch
    pub last_modified_ms: u64,
}

/// Calculates the total size and file count of a directory
/// Uses serial processing to avoid reentrancy issues with nested jwalk calls
#[cfg(test)]
fn calculate_dir_size_with_count(path: &Path) -> (u64, usize) {
    let result = calculate_dir_size_full(path);
    (result.total_size, result.file_count)
}

/// Calculates the total size, file count, symlink status, and last modified time of a directory
/// Uses serial processing to avoid reentrancy issues with nested jwalk calls
/// Returns `has_only_symlinks: true` if the directory contains symlinks but no real files
/// Returns `last_modified_ms` as the most recent modification time of any file in the directory
pub fn calculate_dir_size_full(path: &Path) -> DirectorySizeResult {
    use std::time::UNIX_EPOCH;

    let mut total_size: u64 = 0;
    let mut file_count: usize = 0;
    let mut has_symlinks = false;
    let mut has_real_content = false;
    let mut latest_modified_ms: u64 = 0;

    // Serial processing avoids jwalk reentrancy issues; follow_links counts pnpm symlinks
    let walker = jwalk::WalkDir::new(path)
        .skip_hidden(false)
        .follow_links(true)
        .parallelism(jwalk::Parallelism::Serial);

    for entry in walker.into_iter().flatten() {
        if let Ok(metadata) = entry.metadata() {
            if metadata.is_file() {
                total_size += metadata.len();
                file_count += 1;
                has_real_content = true;

                if let Ok(modified) = metadata.modified() {
                    if let Ok(duration) = modified.duration_since(UNIX_EPOCH) {
                        let modified_ms = duration.as_millis() as u64;
                        if modified_ms > latest_modified_ms {
                            latest_modified_ms = modified_ms;
                        }
                    }
                }
            }
        }
    }

    // Flag pnpm hoisted directories that contain only symlinks
    if !has_real_content {
        has_symlinks = check_directory_has_symlinks(path);
    }

    if latest_modified_ms == 0 {
        latest_modified_ms = path
            .metadata()
            .and_then(|metadata| metadata.modified())
            .map(|modified| {
                modified
                    .duration_since(UNIX_EPOCH)
                    .map(|duration| duration.as_millis() as u64)
                    .unwrap_or(0)
            })
            .unwrap_or(0);
    }

    DirectorySizeResult {
        total_size,
        file_count,
        has_only_symlinks: has_symlinks && !has_real_content,
        last_modified_ms: latest_modified_ms,
    }
}

/// Recursively checks if a directory contains any symlinks
fn check_directory_has_symlinks(path: &Path) -> bool {
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let entry_path = entry.path();

            if entry_path
                .symlink_metadata()
                .map(|metadata| metadata.file_type().is_symlink())
                .unwrap_or(false)
            {
                return true;
            }

            if entry_path.is_dir() && check_directory_has_symlinks(&entry_path) {
                return true;
            }
        }
    }
    false
}

/// Expands ~ to the home directory using the cross-platform dirs crate
pub fn expand_tilde(path: &str) -> String {
    if path.starts_with('~') {
        if let Some(home) = dirs::home_dir() {
            return path.replacen('~', &home.to_string_lossy(), 1);
        }
    }
    path.to_string()
}

/// Checks if a directory name should be skipped during scanning
pub fn should_skip_directory(name: &str) -> bool {
    SKIP_DIRECTORIES.contains(&name)
}

/// Parses a comma-separated string of exclude patterns into a vector of trimmed patterns
pub fn parse_exclude_patterns(exclude_paths: &str) -> Vec<String> {
    if exclude_paths.is_empty() {
        return Vec::new();
    }

    exclude_paths
        .split(',')
        .map(|pattern| pattern.trim().to_string())
        .filter(|pattern| !pattern.is_empty())
        .collect()
}

/// Checks if a path matches a wildcard pattern
/// Supports * as a wildcard that matches any sequence of characters
/// Pattern matching is case-sensitive
fn matches_wildcard_pattern(path: &str, pattern: &str) -> bool {
    let pattern_parts: Vec<&str> = pattern.split('*').collect();

    if pattern_parts.len() == 1 {
        return path.contains(pattern);
    }

    let mut remaining = path;
    let mut first = true;

    for (index, part) in pattern_parts.iter().enumerate() {
        if part.is_empty() {
            continue;
        }

        if first && !pattern.starts_with('*') {
            if !remaining.starts_with(part) {
                return false;
            }
            remaining = &remaining[part.len()..];
        } else if index == pattern_parts.len() - 1 && !pattern.ends_with('*') {
            if !remaining.ends_with(part) {
                return false;
            }
        } else {
            match remaining.find(part) {
                Some(position) => {
                    remaining = &remaining[position + part.len()..];
                }
                None => return false,
            }
        }
        first = false;
    }

    true
}

/// Checks if a path should be excluded based on the exclude patterns
pub fn should_exclude_path(path: &str, exclude_patterns: &[String]) -> bool {
    for pattern in exclude_patterns {
        if matches_wildcard_pattern(path, pattern) {
            return true;
        }
    }
    false
}

/// Checks if a directory is nested inside another dependency directory
/// Used to avoid scanning nested dependency directories (e.g., node_modules inside node_modules)
pub fn is_inside_dependency_directory(
    path_string: &str,
    current_dir_name: &str,
    all_dependency_dirs: &std::collections::HashSet<&str>,
) -> bool {
    let components: Vec<&str> = path_string.split(std::path::MAIN_SEPARATOR).collect();

    let current_position = components
        .iter()
        .rposition(|component| *component == current_dir_name);

    if let Some(position) = current_position {
        for (index, component) in components.iter().enumerate() {
            if index < position && all_dependency_dirs.contains(component) {
                return true;
            }
        }
    }

    false
}

#[cfg(test)]
fn is_nested_node_modules(path_string: &str) -> bool {
    let mut found_count = 0;
    for component in path_string.split(std::path::MAIN_SEPARATOR) {
        if component == "node_modules" {
            found_count += 1;
            if found_count > 1 {
                return true;
            }
        }
    }
    false
}

#[cfg(test)]
#[path = "core.test.rs"]
mod tests;
