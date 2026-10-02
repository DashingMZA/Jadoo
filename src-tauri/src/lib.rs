mod commands;

use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Manager, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // Single instance MUST be registered first (see Tauri docs). Agar app
    // pehle se chal rahi ho aur user dobara khole, to bas maujooda window ko
    // focus kar do — naya instance shuru nahi hota.
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }));
    }

    builder
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        // "--hidden" flag: autostart launch pe pass hota hai taake login ke
        // waqt window na khule, seedha tray mein chala jaye.
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .invoke_handler(tauri::generate_handler![
            commands::profiles::get_profiles,
            commands::profiles::save_profile,
            commands::profiles::delete_profile,
            commands::profiles::get_batch_settings,
            commands::profiles::save_batch_settings,
            commands::profiles::get_app_preferences,
            commands::profiles::save_app_preferences,
            commands::profiles::get_history,
            commands::profiles::clear_history,
            commands::profiles::get_app_info,
            commands::ffmpeg::get_default_video_path,
            commands::ffmpeg::start_batch,
        ])
        .setup(|app| {
            // ---- macOS: dock/cmd-tab se hata do, sirf menu-bar (tray) app jaisa
            // behave kare — Windows pe iski zaroorat nahi (taskbar icon hide()
            // karte hi khud gayab ho jata hai).
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            // ---- System tray -------------------------------------------------
            let show_item = MenuItem::with_id(app, "show", "Jadoo Kholo", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let tray_builder = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("Jadoo");

            // macOS menu-bar icons ko "template" hona chahiye taake wo light/dark
            // menu bar dono mein sahi dikhein (system khud color adjust karta hai).
            #[cfg(target_os = "macos")]
            let tray_builder = tray_builder.icon_as_template(true);

            tray_builder
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "quit" => app.exit(0),
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // ---- Close button -> hide to tray, kabhi bhi full quit nahi ------
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_clone.hide();
                    }
                });

                // Window config mein "visible": false hai (taake hidden autostart
                // pe flash na ho). Normal launch pe yahan se show karte hain;
                // "--hidden" (autostart) pe chupa hi rehne dete hain, seedha tray mein.
                let hidden_start = std::env::args().any(|a| a == "--hidden");
                if !hidden_start {
                    let _ = window.show();
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Jadoo");
}
