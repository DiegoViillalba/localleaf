#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai_service;
mod compiler;
mod error_parser;
mod fs_service;
mod git_service;
mod window_manager;

use tauri::{Emitter, Manager};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            app.manage(window_manager::ProjectWindows::new());
            
            // Notify the frontend if Tectonic is missing so the banner shows immediately
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if !compiler::is_tectonic_available(&handle).await {
                    if let Some(window) = handle.get_webview_window("main") {
                        let _ = window.emit(
                            "tectonic-missing",
                            compiler::tectonic_install_instructions(),
                        );
                    }
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            compiler::compile_latex,
            compiler::check_tectonic,
            compiler::get_tectonic_status,
            compiler::warm_cache,
            fs_service::read_file,
            fs_service::read_file_bytes,
            fs_service::save_file,
            fs_service::list_directory,
            fs_service::scan_project,
            fs_service::create_file,
            fs_service::create_folder,
            fs_service::rename_entry,
            fs_service::delete_entry,
            fs_service::open_folder_dialog,
            fs_service::create_project,
            fs_service::import_files,
            ai_service::stream_ai_assist,
            ai_service::fetch_available_models,
            git_service::git_init,
            git_service::git_status,
            git_service::git_commit,
            git_service::git_log,
            git_service::git_get_diff,
            git_service::git_pull,
            git_service::git_push,
            git_service::git_resolve_conflict,
            git_service::git_restore_file,
            window_manager::open_project_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
