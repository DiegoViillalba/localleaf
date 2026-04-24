use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

fn test_fn(app: tauri::AppHandle) {
    let sidecar_cmd = app.shell().sidecar("tectonic").unwrap();
    let (mut rx, mut child) = sidecar_cmd.spawn().unwrap();
    child.write(b"data".to_vec()).unwrap();
}
