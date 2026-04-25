use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use urlencoding::encode;

pub struct ProjectWindows {
    // Maps project_path -> window_label
    pub windows: Mutex<HashMap<String, String>>,
}

impl ProjectWindows {
    pub fn new() -> Self {
        Self {
            windows: Mutex::new(HashMap::new()),
        }
    }
}

#[tauri::command]
pub async fn open_project_window(app: AppHandle, project_path: String) -> Result<(), String> {
    let state = app.state::<ProjectWindows>();

    let mut windows_map = state.windows.lock().unwrap();

    // If the project is already open, focus its window
    if let Some(label) = windows_map.get(&project_path) {
        if let Some(window) = app.get_webview_window(label) {
            window.set_focus().map_err(|e| format!("Error enfocando ventana: {}", e))?;
            return Ok(());
        } else {
            // Window doesn't exist anymore, clean up map and proceed to open new one
            windows_map.remove(&project_path.clone());
        }
    }

    // Generate unique label
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let new_label = format!("project_{}", timestamp);

    // Build URL with query parameter
    let encoded_path = encode(&project_path);
    let url = format!("index.html?project={}", encoded_path);

    // Create window
    let window_builder = WebviewWindowBuilder::new(&app, &new_label, WebviewUrl::App(url.into()))
        .title("LocalLeaf")
        .inner_size(1440.0, 900.0)
        .min_inner_size(900.0, 600.0)
        .resizable(true);

    let window = window_builder
        .build()
        .map_err(|e| format!("Error creando ventana: {}", e))?;

    // Register closure to clean up state when window closes
    let path_clone = project_path.clone();
    let app_clone = app.clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::Destroyed = event {
            if let Ok(mut map) = app_clone.state::<ProjectWindows>().windows.lock() {
                map.remove(&path_clone);
            }
        }
    });

    windows_map.insert(project_path, new_label);

    Ok(())
}
