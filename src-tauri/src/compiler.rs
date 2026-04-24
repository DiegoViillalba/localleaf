use std::path::Path;
use tauri_plugin_shell::ShellExt;

use serde::{Deserialize, Serialize};

use crate::error_parser;

#[derive(Debug, Serialize, Deserialize)]
pub struct CompileResult {
    pub success: bool,
    pub pdf_path: Option<String>,
    pub errors: Vec<serde_json::Value>,
    pub raw_log: String,
}

/// Check if Tectonic is available in PATH
pub async fn is_tectonic_available(app: &tauri::AppHandle) -> bool {
    if let Ok(sidecar_command) = app.shell().sidecar("tectonic") {
        sidecar_command
            .arg("--version")
            .output()
            .await
            .map(|o| o.status.success())
            .unwrap_or(false)
    } else {
        false
    }
}

pub fn tectonic_install_instructions() -> String {
    "Tectonic no está instalado.\n\nPara instalarlo:\n• macOS: brew install tectonic\n• Linux: cargo install tectonic  (o descarga el binario en https://tectonic-typesetting.github.io)\n• Windows: descarga el binario desde https://tectonic-typesetting.github.io".to_string()
}

/// Compile a .tex file using Tectonic. Returns the path to the generated PDF.
#[tauri::command]
pub async fn compile_latex(app: tauri::AppHandle, tex_path: String) -> Result<CompileResult, String> {
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
        });
    }

    let path = std::path::PathBuf::from(&tex_path);
    let output_dir = path
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| ".".to_string());

    let tex_path_clone = tex_path.clone();
    let output_dir_clone = output_dir.clone();

    let sidecar_cmd = match app.shell().sidecar("tectonic") {
        Ok(cmd) => cmd,
        Err(e) => return Err(format!("No se pudo inicializar el sidecar de Tectonic: {}", e)),
    };

    let output = sidecar_cmd
        .arg("--outdir")
        .arg(&output_dir_clone)
        .arg("--keep-logs")
        .arg(&tex_path_clone)
        // Run from the project directory so \input / \include resolve relative paths correctly
        .current_dir(&output_dir_clone)
        .output()
        .await
        .map_err(|e| e.to_string())?;

    let raw_log = format!(
        "{}\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );

    if output.status.success() {
        // Tectonic outputs <name>.pdf in the outdir
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
        })
    } else {
        let parsed = error_parser::parse_latex_log(&raw_log);
        let errors = if parsed.is_empty() {
            // Fallback: show last 20 lines of raw log
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
        })
    }
}

#[tauri::command]
pub async fn check_tectonic(app: tauri::AppHandle) -> bool {
    is_tectonic_available(&app).await
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
        if let Ok(sidecar_command) = app.shell().sidecar("tectonic") {
            if let Ok(output) = sidecar_command.arg("--version").output().await {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    if let Some(v) = stdout.split_whitespace().nth(1) {
                        version = Some(v.to_string());
                    }
                }
            }
        }
    }

    if let Some(dir) = dirs::cache_dir() {
        let t_cache = dir.join("Tectonic");
        cache_dir = Some(t_cache.to_string_lossy().to_string());
        if t_cache.exists() {
            // Naive check if there are files in urls directory indicating cached bundles
            if t_cache.join("urls").exists() || t_cache.join("manifests").exists() {
                bundle_cached = true;
            }
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
    
    // We run tectonic on an empty input from stdin.
    // Tectonic requires at least something, so we pass a minimal valid document.
    let min_doc = r#"\documentclass{article}\begin{document}warm\end{document}"#;
    let temp_dir = std::env::temp_dir();
    
    let sidecar_cmd = app.shell().sidecar("tectonic")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?;
        
    let (mut rx, mut child) = sidecar_cmd
        .arg("--outdir")
        .arg(&temp_dir)
        .arg("-") // read from stdin
        .spawn()
        .map_err(|e| format!("Failed to spawn tectonic: {}", e))?;
    
    child.write(min_doc.as_bytes()).map_err(|e| format!("Failed to write to stdin: {}", e))?;
    
    // Wait for process to exit
    while let Some(_) = rx.recv().await {}
    
    Ok(())
}
