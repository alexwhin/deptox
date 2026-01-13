#[cfg(target_os = "macos")]
use std::path::Path;
#[cfg(target_os = "macos")]
use std::process::Command;
#[cfg(target_os = "macos")]
use std::time::Instant;
#[cfg(target_os = "macos")]
use tracing::{debug, error, instrument, warn};
#[cfg(not(target_os = "macos"))]
use tracing::{instrument, warn};

#[cfg(target_os = "macos")]
fn validate_path_exists(path: &str) -> Result<(), String> {
    let path_buf = Path::new(path);
    if !path_buf.exists() {
        warn!("Path does not exist");
        return Err("Path does not exist".to_string());
    }
    Ok(())
}

#[cfg(target_os = "macos")]
fn validate_path_within_home(path: &str) -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or_else(|| {
        warn!("Could not determine home directory");
        "Could not determine home directory".to_string()
    })?;

    let canonical_path = Path::new(path).canonicalize().map_err(|error| {
        warn!(%error, "Failed to canonicalize path");
        "Invalid path".to_string()
    })?;

    let canonical_home = home_dir.canonicalize().map_err(|error| {
        warn!(%error, "Failed to canonicalize home directory");
        "Could not verify home directory".to_string()
    })?;

    if !canonical_path.starts_with(&canonical_home) {
        warn!("Path is outside home directory");
        return Err("Path must be within home directory".to_string());
    }

    Ok(())
}

#[tauri::command]
#[instrument(skip_all, fields(path = %path))]
pub fn open_in_finder(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let start = Instant::now();
        debug!("Opening path in Finder");

        validate_path_exists(&path)?;
        validate_path_within_home(&path)?;

        Command::new("open").arg(&path).spawn().map_err(|error| {
            error!(%error, "Failed to spawn open command");
            format!("Failed to open Finder: {error}")
        })?;
        debug!(
            duration_ms = start.elapsed().as_millis() as u64,
            "Opened in Finder"
        );
        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = path;
        warn!("open_in_finder is only supported on macOS");
        Err("open_in_finder is only supported on macOS".to_string())
    }
}

#[cfg(test)]
#[path = "filesystem.test.rs"]
mod tests;
