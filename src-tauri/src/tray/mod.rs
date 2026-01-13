use crate::config::bytes::{GB, KB, MB, TB};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tracing::{debug, instrument};

fn format_bytes_compact(bytes: u64) -> String {
    let bytes_f64 = bytes as f64;

    let (value, unit) = if bytes_f64 >= TB {
        (bytes_f64 / TB, "TB")
    } else if bytes_f64 >= GB {
        (bytes_f64 / GB, "GB")
    } else if bytes_f64 >= MB {
        (bytes_f64 / MB, "MB")
    } else if bytes_f64 >= KB {
        (bytes_f64 / KB, "KB")
    } else {
        (bytes_f64, "B")
    };

    format!("{value:.2}{unit}")
}

#[tauri::command]
#[instrument(skip(app))]
pub async fn set_tray_icon(
    app: tauri::AppHandle,
    total_size: u64,
    threshold: u64,
) -> Result<(), String> {
    let tray = app
        .tray_by_id("main")
        .ok_or_else(|| "Tray icon not found".to_string())?;

    if total_size > threshold {
        let excess = total_size - threshold;
        let excess_text = format!("  +{}", format_bytes_compact(excess));

        debug!(%excess_text, "Setting tray alert text");

        #[cfg(target_os = "macos")]
        {
            tray.set_title(Some(&excess_text))
                .map_err(|error| format!("Failed to set tray title: {error}"))?;
        }

        #[cfg(not(target_os = "macos"))]
        {
            tray.set_tooltip(Some(&format!("Exceeded by {excess_text}")))
                .map_err(|error| format!("Failed to set tray tooltip: {error}"))?;
        }
    } else {
        #[cfg(target_os = "macos")]
        {
            tray.set_title(Some(""))
                .map_err(|error| format!("Failed to set empty tray title: {error}"))?;
        }

        #[cfg(not(target_os = "macos"))]
        {
            tray.set_tooltip(Some("deptox"))
                .map_err(|error| format!("Failed to set tray tooltip: {error}"))?;
        }
    }

    Ok(())
}

#[tauri::command]
#[instrument(skip(app))]
pub async fn set_tray_update_available(
    app: tauri::AppHandle,
    available: bool,
    version: Option<String>,
) -> Result<(), String> {
    let tray = app
        .tray_by_id("main")
        .ok_or_else(|| "Tray icon not found".to_string())?;

    let scan_now = MenuItem::with_id(&app, "scan_now", "Scan Now", true, None::<&str>)
        .map_err(|error| format!("Failed to create menu item: {error}"))?;
    let settings = MenuItem::with_id(&app, "settings", "Settings", true, None::<&str>)
        .map_err(|error| format!("Failed to create menu item: {error}"))?;
    let separator = PredefinedMenuItem::separator(&app)
        .map_err(|error| format!("Failed to create separator: {error}"))?;
    let about = MenuItem::with_id(&app, "about", "About", true, None::<&str>)
        .map_err(|error| format!("Failed to create menu item: {error}"))?;
    let quit = MenuItem::with_id(&app, "quit", "Quit", true, None::<&str>)
        .map_err(|error| format!("Failed to create menu item: {error}"))?;

    let menu = if available {
        let update_item =
            MenuItem::with_id(&app, "update_available", "Update Now", true, None::<&str>)
                .map_err(|error| format!("Failed to create update menu item: {error}"))?;
        let update_separator = PredefinedMenuItem::separator(&app)
            .map_err(|error| format!("Failed to create separator: {error}"))?;

        debug!(?version, "Showing update available in tray menu");

        Menu::with_items(
            &app,
            &[
                &update_item,
                &update_separator,
                &scan_now,
                &settings,
                &separator,
                &about,
                &quit,
            ],
        )
        .map_err(|error| format!("Failed to create menu: {error}"))?
    } else {
        debug!("Hiding update available from tray menu");

        Menu::with_items(&app, &[&scan_now, &settings, &separator, &about, &quit])
            .map_err(|error| format!("Failed to create menu: {error}"))?
    };

    tray.set_menu(Some(menu))
        .map_err(|error| format!("Failed to set tray menu: {error}"))?;

    Ok(())
}

#[cfg(test)]
#[path = "mod.test.rs"]
mod tests;
