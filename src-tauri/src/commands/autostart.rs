use tauri_plugin_autostart::ManagerExt;
use tracing::{info, instrument};

#[tauri::command]
#[instrument(skip(app_handle))]
pub async fn get_autostart_enabled(app_handle: tauri::AppHandle) -> Result<bool, String> {
    let autostart_manager = app_handle.autolaunch();
    autostart_manager
        .is_enabled()
        .map_err(|error| format!("Failed to check autostart status: {error}"))
}

#[tauri::command]
#[instrument(skip(app_handle))]
pub async fn set_autostart_enabled(
    app_handle: tauri::AppHandle,
    enabled: bool,
) -> Result<(), String> {
    let autostart_manager = app_handle.autolaunch();

    if enabled {
        info!("Enabling autostart");
        autostart_manager
            .enable()
            .map_err(|error| format!("Failed to enable autostart: {error}"))?;
    } else {
        info!("Disabling autostart");
        autostart_manager
            .disable()
            .map_err(|error| format!("Failed to disable autostart: {error}"))?;
    }

    Ok(())
}
