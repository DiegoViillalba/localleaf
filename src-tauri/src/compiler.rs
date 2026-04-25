use tauri_plugin_shell::ShellExt;

use serde::{Deserialize, Serialize};

use tauri_plugin_shell::process::CommandChild;
use std::sync::Mutex;
use std::collections::HashMap;

use crate::error_parser;

pub struct CompileState {
    pub active_processes: Mutex<HashMap<String, CommandChild>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompileResult {
    pub success: bool,
    pub pdf_path: Option<String>,
    pub errors: Vec<serde_json::Value>,
    pub raw_log: String,
    pub needs_shell_escape: bool,
}


/// Returns a tectonic command, preferring the bundled sidecar and
/// falling back to whatever `tectonic` is on the system PATH.
/// This lets `cargo tauri dev` work with a brew/cargo-installed tectonic
/// while production bundles use the sidecar binary.
fn tectonic_cmd(app: &tauri::AppHandle) -> tauri_plugin_shell::process::Command {
    app.shell()
        .sidecar("tectonic")
        .unwrap_or_else(|_| app.shell().command("tectonic"))
}

/// Returns true if any tectonic binary (sidecar or system) can be executed.
pub async fn is_tectonic_available(app: &tauri::AppHandle) -> bool {
    tectonic_cmd(app)
        .arg("--version")
        .output()
        .await
        .map(|o| o.status.success())
        .unwrap_or(false)
}

pub fn tectonic_install_instructions() -> String {
    "Tectonic no está instalado.\n\nPara instalarlo:\n\
     • macOS: brew install tectonic\n\
     • Linux: cargo install tectonic  (o descarga el binario en https://tectonic-typesetting.github.io)\n\
     • Windows: descarga el binario desde https://tectonic-typesetting.github.io"
        .to_string()
}

/// Compile a .tex file using Tectonic. Returns the path to the generated PDF.
#[tauri::command]
pub async fn compile_latex(
    app: tauri::AppHandle,
    state: tauri::State<'_, CompileState>,
    tex_path: String,
    shell_escape: bool,
    compile_id: Option<String>,
) -> Result<CompileResult, String> {
    if !is_tectonic_available(&app).await {
        return Ok(CompileResult {
            success: false,
            pdf_path: None,
            errors: vec![serde_json::json!({
                "line": null,
                "message": tectonic_install_instructions(),
                "kind": "error"
            })],
            raw_log: String::new(),
            needs_shell_escape: false,
        });
    }

    let path = std::path::PathBuf::from(&tex_path);
    let output_dir = path
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| ".".to_string());

    let mut cmd = tectonic_cmd(&app);
    cmd = cmd
        .arg("--outdir")
        .arg(&output_dir)
        .arg("--keep-logs");

    if shell_escape {
        cmd = cmd.arg("--shell-escape");
    }

    let (mut rx, child) = cmd
        .arg(&tex_path)
        .current_dir(&output_dir)
        .spawn()
        .map_err(|e| e.to_string())?;

    if let Some(ref cid) = compile_id {
        if let Ok(mut map) = state.active_processes.lock() {
            map.insert(cid.clone(), child);
        }
    }

    let mut stdout_buf = Vec::new();
    let mut stderr_buf = Vec::new();
    let mut exit_code = None;

    while let Some(event) = rx.recv().await {
        match event {
            tauri_plugin_shell::process::CommandEvent::Stdout(data) => stdout_buf.extend(data),
            tauri_plugin_shell::process::CommandEvent::Stderr(data) => stderr_buf.extend(data),
            tauri_plugin_shell::process::CommandEvent::Terminated(payload) => exit_code = payload.code,
            tauri_plugin_shell::process::CommandEvent::Error(err) => stderr_buf.extend(err.into_bytes()),
            _ => {}
        }
    }

    if let Some(ref cid) = compile_id {
        if let Ok(mut map) = state.active_processes.lock() {
            map.remove(cid);
        }
    }

    let raw_log = format!(
        "{}\n{}",
        String::from_utf8_lossy(&stdout_buf),
        String::from_utf8_lossy(&stderr_buf)
    );

    if exit_code == Some(0) {
        let stem = path
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_default();
        let pdf_path = format!("{}/{}.pdf", output_dir, stem);

        Ok(CompileResult {
            success: true,
            pdf_path: Some(pdf_path),
            errors: vec![],
            raw_log,
            needs_shell_escape: false,
        })
    } else {
        let nse = error_parser::detect_shell_escape_needed(&raw_log);
        let parsed = error_parser::parse_latex_log(&raw_log);
        let errors = if parsed.is_empty() {
            let fallback = raw_log
                .lines()
                .rev()
                .take(20)
                .collect::<Vec<_>>()
                .into_iter()
                .rev()
                .collect::<Vec<_>>()
                .join("\n");
            vec![serde_json::json!({
                "line": null,
                "message": fallback,
                "kind": "error"
            })]
        } else {
            error_parser::format_errors_for_ui(&parsed)
        };

        Ok(CompileResult {
            success: false,
            pdf_path: None,
            errors,
            raw_log,
            needs_shell_escape: nse,
        })
    }
}

#[tauri::command]
pub async fn check_tectonic(app: tauri::AppHandle) -> bool {
    is_tectonic_available(&app).await
}

#[tauri::command]
pub fn cancel_compilation(state: tauri::State<'_, CompileState>, compile_id: String) {
    if let Ok(mut map) = state.active_processes.lock() {
        if let Some(child) = map.remove(&compile_id) {
            let _ = child.kill();
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TectonicStatus {
    pub installed: bool,
    pub version: Option<String>,
    pub cache_dir: Option<String>,
    pub bundle_cached: bool,
}

#[tauri::command]
pub async fn get_tectonic_status(app: tauri::AppHandle) -> Result<TectonicStatus, String> {
    let installed = is_tectonic_available(&app).await;
    let mut version = None;
    let mut bundle_cached = false;
    let mut cache_dir = None;

    if installed {
        if let Ok(out) = tectonic_cmd(&app).arg("--version").output().await {
            if out.status.success() {
                let stdout = String::from_utf8_lossy(&out.stdout);
                if let Some(v) = stdout.split_whitespace().nth(1) {
                    version = Some(v.to_string());
                }
            }
        }
    }

    if let Some(dir) = dirs::cache_dir() {
        let t_cache = dir.join("Tectonic");
        cache_dir = Some(t_cache.to_string_lossy().to_string());
        if t_cache.exists() && (t_cache.join("urls").exists() || t_cache.join("manifests").exists()) {
            bundle_cached = true;
        }
    }

    Ok(TectonicStatus {
        installed,
        version,
        cache_dir,
        bundle_cached,
    })
}

#[tauri::command]
pub async fn warm_cache(app: tauri::AppHandle) -> Result<(), String> {
    if !is_tectonic_available(&app).await {
        return Err("Tectonic no está instalado".to_string());
    }

    let min_doc = r#"\documentclass{article}\begin{document}warm\end{document}"#;
    let temp_dir = std::env::temp_dir();

    let (mut rx, mut child) = tectonic_cmd(&app)
        .arg("--outdir")
        .arg(&temp_dir)
        .arg("-") // read from stdin
        .spawn()
        .map_err(|e| format!("Failed to spawn tectonic: {}", e))?;

    child
        .write(min_doc.as_bytes())
        .map_err(|e| format!("Failed to write to stdin: {}", e))?;

    while rx.recv().await.is_some() {}

    Ok(())
}
