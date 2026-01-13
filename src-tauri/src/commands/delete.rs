use crate::config;
use crate::scanner::DependencyCategory;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Arc;
use std::time::Instant;
use thiserror::Error;
use tokio::sync::Semaphore;
use tracing::{error, info, instrument, warn};

use super::settings::get_settings_sync;

#[derive(Debug, Clone, PartialEq, Error)]
pub enum DeleteValidationError {
    #[error("Directory does not exist")]
    DoesNotExist,
    #[error("Path is not a directory")]
    NotADirectory,
    #[error("Can only delete dependency directories")]
    NotDependencyDirectory,
    #[error("Invalid path: {0}")]
    InvalidPath(String),
}

#[derive(Debug, Error)]
#[allow(dead_code)]
pub enum DeleteError {
    #[error("Validation failed: {0}")]
    Validation(#[from] DeleteValidationError),
    #[error("Failed to move to trash: {0}")]
    Trash(#[from] trash::Error),
    #[error("Failed to delete: {0}")]
    Remove(#[from] std::io::Error),
}

fn canonicalize_path(path: &Path) -> Result<std::path::PathBuf, DeleteValidationError> {
    path.canonicalize().map_err(|error| {
        DeleteValidationError::InvalidPath(format!("Failed to resolve path: {error}"))
    })
}

fn validate_delete_path(path: &Path) -> Result<std::path::PathBuf, DeleteValidationError> {
    let canonical_path = canonicalize_path(path)?;

    if !canonical_path.exists() {
        return Err(DeleteValidationError::DoesNotExist);
    }

    if !canonical_path.is_dir() {
        return Err(DeleteValidationError::NotADirectory);
    }

    let is_dependency_dir = canonical_path
        .file_name()
        .and_then(|name| name.to_str())
        .map(|name| {
            DependencyCategory::from_directory_name(name).is_some()
                || name == "vendor"
                || name == "deps"
                || name == "pkg"
        })
        .unwrap_or(false);

    if !is_dependency_dir {
        return Err(DeleteValidationError::NotDependencyDirectory);
    }

    Ok(canonical_path)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteResult {
    pub success: bool,
    pub path: String,
    pub size_freed: u64,
}

#[tauri::command]
#[instrument(skip_all, fields(path = %path))]
pub async fn delete_to_trash(path: String) -> Result<DeleteResult, String> {
    let start = Instant::now();
    info!("Starting delete operation");

    let path_buf = Path::new(&path);
    let canonical_path = validate_delete_path(path_buf).map_err(|error| {
        warn!(%error, "Validation failed");
        error.to_string()
    })?;

    let size_freed = 0;

    let permanent_delete = get_settings_sync()
        .map(|settings| settings.permanent_delete)
        .unwrap_or(false);

    if permanent_delete {
        std::fs::remove_dir_all(&canonical_path).map_err(|error| {
            error!(%error, "Failed to permanently delete");
            format!("Failed to permanently delete: {error}")
        })?;

        info!(
            duration_ms = start.elapsed().as_millis() as u64,
            size_mb = size_freed as f64 / 1024.0 / 1024.0,
            "Successfully permanently deleted"
        );
    } else if let Err(error) = trash::delete(&canonical_path) {
        error!(%error, "Failed to move to trash");
        let error_message = error.to_string();

        if error_message.contains("needs to be downloaded") {
            warn!("iCloud directory detected, attempting force delete");
            std::fs::remove_dir_all(&canonical_path).map_err(|remove_error| {
                error!(%remove_error, "Force delete also failed");
                format!("Cannot delete: This directory is stored in iCloud. Attempted force delete but failed: {remove_error}")
            })?;
            info!("Successfully force-deleted iCloud directory");
        } else {
            return Err(format!("Failed to move to trash: {error}"));
        }
    } else {
        info!(
            duration_ms = start.elapsed().as_millis() as u64,
            size_mb = size_freed as f64 / 1024.0 / 1024.0,
            "Successfully moved to trash"
        );
    }

    Ok(DeleteResult {
        success: true,
        path: canonical_path.to_string_lossy().to_string(),
        size_freed,
    })
}

#[tauri::command]
#[instrument(skip_all, fields(count = paths.len()))]
pub async fn delete_all_to_trash(paths: Vec<String>) -> Result<Vec<DeleteResult>, String> {
    let start = Instant::now();
    info!("Starting batch delete operation");

    let semaphore = Arc::new(Semaphore::new(config::delete::MAX_CONCURRENT_DELETES));

    let handles: Vec<_> = paths
        .into_iter()
        .map(|path| {
            let semaphore = semaphore.clone();
            tokio::spawn(async move {
                let _permit = semaphore.acquire().await;
                match delete_to_trash(path.clone()).await {
                    Ok(result) => result,
                    Err(error) => {
                        error!(%path, %error, "Failed to delete");
                        DeleteResult {
                            success: false,
                            path,
                            size_freed: 0,
                        }
                    }
                }
            })
        })
        .collect();

    let mut results = Vec::with_capacity(handles.len());
    for handle in handles {
        match handle.await {
            Ok(result) => results.push(result),
            Err(join_error) => {
                error!(%join_error, "Task panicked");
                results.push(DeleteResult {
                    success: false,
                    path: "unknown (task panicked)".to_string(),
                    size_freed: 0,
                });
            }
        }
    }

    let successful = results.iter().filter(|result| result.success).count();
    info!(
        successful,
        total = results.len(),
        duration_ms = start.elapsed().as_millis() as u64,
        "Batch delete complete"
    );

    Ok(results)
}

#[cfg(test)]
#[path = "delete.test.rs"]
mod tests;
