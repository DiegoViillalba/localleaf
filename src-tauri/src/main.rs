#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai_service;
mod compiler;
mod error_parser;
mod fs_service;

use tauri::{Emitter, Manager};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if !compiler::is_tectonic_available() {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit(
                        "tectonic-missing",
                        compiler::tectonic_install_instructions(),
                    );
                }
            }
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
            ai_service::stream_ai_assist,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
