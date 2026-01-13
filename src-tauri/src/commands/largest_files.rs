use crate::config;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::time::Instant;
use tracing::{debug, instrument, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub path: String,
    pub size_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LargestFilesResult {
    pub files: Vec<FileEntry>,
    pub directory_path: String,
}

#[tauri::command]
#[instrument(skip_all, fields(path = %path))]
pub async fn get_largest_files(path: String) -> Result<LargestFilesResult, String> {
    let start = Instant::now();
    debug!("Finding largest files in directory");

    let path_buf = Path::new(&path);

    if !path_buf.exists() {
        warn!("Directory does not exist");
        return Err("Directory does not exist".to_string());
    }

    if !path_buf.is_dir() {
        warn!("Path is not a directory");
        return Err("Path is not a directory".to_string());
    }

    let mut files: Vec<FileEntry> = Vec::new();

    let walker = jwalk::WalkDir::new(&path)
        .skip_hidden(false)
        .follow_links(false)
        .parallelism(jwalk::Parallelism::Serial);

    for entry in walker.into_iter().flatten() {
        if let Ok(metadata) = entry.metadata() {
            if metadata.is_file() {
                let file_path = entry.path().to_string_lossy().to_string();
                let size_bytes = metadata.len();

                // Keep track of top N files efficiently
                if files.len() < config::largest_files::MAX_FILES {
                    files.push(FileEntry {
                        path: file_path,
                        size_bytes,
                    });
                    files.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
                } else if size_bytes > files.last().map_or(0, |file| file.size_bytes) {
                    files.pop();
                    files.push(FileEntry {
                        path: file_path,
                        size_bytes,
                    });
                    files.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
                }
            }
        }
    }

    debug!(
        file_count = files.len(),
        duration_ms = start.elapsed().as_millis() as u64,
        "Found largest files"
    );

    Ok(LargestFilesResult {
        files,
        directory_path: path,
    })
}

#[cfg(test)]
#[path = "largest_files.test.rs"]
mod tests;
