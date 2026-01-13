mod commands;
mod config;
mod scanner;
mod tray;

#[cfg(test)]
mod test_helpers;

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{
    menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Listener, Manager, RunEvent,
};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_positioner::{Position, WindowExt};
use tokio::sync::watch;
use tracing::{debug, error, info};
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

fn init_tracing() {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("deptox_lib=info,warn"));

    tracing_subscriber::registry()
        .with(fmt::layer().with_target(true).with_level(true))
        .with(filter)
        .init();
}

fn show_window_with_event<T: serde::Serialize + Clone>(
    app_handle: &tauri::AppHandle,
    event_name: &str,
    payload: T,
) {
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.move_window(Position::TrayCenter);
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.emit(event_name, payload);
    }
}

#[tauri::command]
async fn resize_window(app: tauri::AppHandle, font_size: String) -> Result<(), String> {
    let (width, height) = config::window::SIZES
        .iter()
        .find(|(size, _, _)| *size == font_size)
        .map(|(_, width, height)| (*width, *height))
        .unwrap_or((
            config::window::DEFAULT_WIDTH,
            config::window::DEFAULT_HEIGHT,
        ));

    if let Some(window) = app.get_webview_window("main") {
        window
            .set_size(tauri::Size::Logical(tauri::LogicalSize { width, height }))
            .map_err(|error| format!("Failed to resize window: {error}"))?;
        debug!(font_size, width, height, "Window resized");
    }

    Ok(())
}

fn handle_menu_event(
    app_handle: &tauri::AppHandle,
    _menu_app_handle: &tauri::AppHandle,
    event: &MenuEvent,
) {
    let menu_id = event.id().as_ref();
    debug!(menu_id, "Tray menu item clicked");

    match menu_id {
        "scan_now" => {
            info!("Triggering scan from tray menu");
            show_window_with_event(app_handle, "tray-scan-requested", ());
        }
        "settings" => {
            info!("Opening settings from tray menu");
            show_window_with_event(app_handle, "tray-settings-requested", ());
        }
        "about" => {
            info!("Opening about from tray menu");
            show_window_with_event(app_handle, "tray-about-requested", ());
        }
        "update_available" => {
            info!("Triggering update from tray menu");
            show_window_with_event(app_handle, "tray-update-requested", ());
        }
        "quit" => {
            info!("Quitting application from tray menu");
            app_handle.exit(0);
        }
        _ => {
            debug!(menu_id, "Unknown menu item clicked");
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    init_tracing();
    info!("Starting deptox");

    tauri::Builder::default()
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--autostart"]),
        ))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            commands::scan::start_scan,
            commands::scan::cancel_scan,
            commands::scan::rescan_directory,
            commands::delete::delete_to_trash,
            commands::delete::delete_all_to_trash,
            commands::settings::get_settings,
            commands::settings::save_settings,
            commands::settings::reset_settings,
            commands::filesystem::open_in_finder,
            commands::largest_files::get_largest_files,
            commands::locale::get_system_locale,
            commands::autostart::get_autostart_enabled,
            commands::autostart::set_autostart_enabled,
            commands::license::get_license_info,
            commands::license::activate_license,
            commands::license::revalidate_license,
            commands::license::deactivate_license,
            tray::set_tray_icon,
            tray::set_tray_update_available,
            resize_window,
        ])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let window = tauri::WebviewWindowBuilder::new(
                app,
                "main",
                tauri::WebviewUrl::App("index.html".into()),
            )
            .title("deptox")
            .inner_size(
                config::window::DEFAULT_WIDTH,
                config::window::DEFAULT_HEIGHT,
            )
            .resizable(false)
            .visible(false)
            .decorations(false)
            .transparent(true)
            .always_on_top(true)
            .skip_taskbar(true)
            .build()?;

            // Prevent blur handler from hiding window whilst a dialog is open
            let dialog_open = Arc::new(AtomicBool::new(false));
            let dialog_open_for_blur = dialog_open.clone();
            let dialog_open_for_open = dialog_open.clone();
            let dialog_open_for_close = dialog_open.clone();

            let window_clone = window.clone();
            window.listen("tauri://blur", move |_event| {
                if dialog_open_for_blur.load(Ordering::SeqCst) {
                    debug!("Window blur event ignored - dialog is open");
                    return;
                }
                debug!("Window blur event - hiding window");
                let _ = window_clone.hide();
            });

            window.listen("dialog-opening", move |_event| {
                debug!("Dialog opening - disabling blur handler");
                dialog_open_for_open.store(true, Ordering::SeqCst);
            });

            window.listen("dialog-closed", move |_event| {
                debug!("Dialog closed - re-enabling blur handler");
                dialog_open_for_close.store(false, Ordering::SeqCst);
            });

            {
                use tauri_plugin_autostart::ManagerExt;
                let autostart_manager = app.autolaunch();
                match autostart_manager.is_enabled() {
                    Ok(false) => {
                        info!("First launch detected - enabling autostart by default");
                        if let Err(error) = autostart_manager.enable() {
                            error!(%error, "Failed to enable autostart on first launch");
                        }
                    }
                    Ok(true) => {
                        debug!("Autostart already enabled");
                    }
                    Err(error) => {
                        error!(%error, "Failed to check autostart status");
                    }
                }
            }

            let (shutdown_tx, shutdown_rx) = watch::channel(false);
            app.manage(shutdown_tx);

            let background_app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                info!(
                    interval_minutes = config::background::SCAN_INTERVAL_MINUTES,
                    "Starting background scanner"
                );

                let mut shutdown_rx = shutdown_rx;
                let scan_interval =
                    Duration::from_secs(config::background::SCAN_INTERVAL_MINUTES * 60);

                loop {
                    // Use tokio::select to allow interrupting the sleep on shutdown
                    tokio::select! {
                        _ = tokio::time::sleep(scan_interval) => {
                            // Sleep completed, run the scan
                        }
                        _ = shutdown_rx.changed() => {
                            if *shutdown_rx.borrow() {
                                info!("Background scanner received shutdown signal");
                                break;
                            }
                        }
                    }

                    if *shutdown_rx.borrow() {
                        break;
                    }

                    debug!("Running scheduled background scan");
                    let total_size =
                        tokio::task::spawn_blocking(scanner::calculate_total_dependency_size)
                            .await
                            .unwrap_or(0);

                    let threshold = commands::settings::get_settings_sync()
                        .map(|settings| settings.threshold_bytes)
                        .unwrap_or(config::defaults::BACKGROUND_THRESHOLD_BYTES);

                    info!(
                        total_size_gb = total_size as f64 / 1024.0 / 1024.0 / 1024.0,
                        threshold_gb = threshold as f64 / 1024.0 / 1024.0 / 1024.0,
                        exceeds_threshold = total_size > threshold,
                        "Background scan threshold check"
                    );

                    if let Err(error) =
                        tray::set_tray_icon(background_app_handle.clone(), total_size, threshold)
                            .await
                    {
                        error!(%error, "Failed to update tray icon");
                    }
                }

                info!("Background scanner stopped");
            });

            let app_handle = app.handle().clone();

            let tray_icon = tauri::image::Image::from_bytes(include_bytes!(
                "../icons/tray/icon.png"
            ))
            .map_err(|error| {
                tauri::Error::AssetNotFound(format!("Failed to load tray icon: {error}"))
            })?;

            let scan_now = MenuItem::with_id(app, "scan_now", "Scan Now", true, None::<&str>)?;
            let settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let about = MenuItem::with_id(app, "about", "About", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&scan_now, &settings, &separator, &about, &quit])?;

            let menu_app_handle = app.handle().clone();
            app.on_menu_event(move |app_handle, event: MenuEvent| {
                handle_menu_event(app_handle, &menu_app_handle, &event);
            });

            TrayIconBuilder::with_id("main")
                .icon(tray_icon)
                .icon_as_template(true)
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_tray_icon_event(move |tray, event| {
                    tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);

                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = &event
                    {
                        if let Some(window) = app_handle.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.move_window(Position::TrayCenter);
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let RunEvent::Exit = event {
                info!("Application exiting, signaling background scanner to stop");
                if let Some(shutdown_tx) = app_handle.try_state::<watch::Sender<bool>>() {
                    let _ = shutdown_tx.send(true);
                }
            }
        });
}
