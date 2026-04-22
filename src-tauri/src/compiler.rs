use std::path::Path;
use std::process::Command;

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
pub fn is_tectonic_available() -> bool {
    Command::new("tectonic")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

pub fn tectonic_install_instructions() -> String {
    "Tectonic no está instalado.\n\nPara instalarlo:\n• macOS: brew install tectonic\n• Linux: cargo install tectonic  (o descarga el binario en https://tectonic-typesetting.github.io)\n• Windows: descarga el binario desde https://tectonic-typesetting.github.io".to_string()
}

/// Compile a .tex file using Tectonic. Returns the path to the generated PDF.
#[tauri::command]
pub fn compile_latex(tex_path: String) -> CompileResult {
    if !is_tectonic_available() {
        return CompileResult {
            success: false,
            pdf_path: None,
            errors: vec![serde_json::json!({
                "line": null,
                "message": tectonic_install_instructions(),
                "kind": "error"
            })],
            raw_log: String::new(),
        };
    }

    let path = Path::new(&tex_path);
    let output_dir = path
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| ".".to_string());

    let output = Command::new("tectonic")
        .arg("--outdir")
        .arg(&output_dir)
        .arg("--keep-logs")
        .arg(&tex_path)
        // Run from the project directory so \input / \include resolve relative paths correctly
        .current_dir(&output_dir)
        .output();

    match output {
        Err(e) => CompileResult {
            success: false,
            pdf_path: None,
            errors: vec![serde_json::json!({
                "line": null,
                "message": format!("No se pudo ejecutar Tectonic: {}", e),
                "kind": "error"
            })],
            raw_log: String::new(),
        },
        Ok(out) => {
            let raw_log = format!(
                "{}\n{}",
                String::from_utf8_lossy(&out.stdout),
                String::from_utf8_lossy(&out.stderr)
            );

            if out.status.success() {
                // Tectonic outputs <name>.pdf in the outdir
                let stem = path
                    .file_stem()
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_default();
                let pdf_path = format!("{}/{}.pdf", output_dir, stem);

                CompileResult {
                    success: true,
                    pdf_path: Some(pdf_path),
                    errors: vec![],
                    raw_log,
                }
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

                CompileResult {
                    success: false,
                    pdf_path: None,
                    errors,
                    raw_log,
                }
            }
        }
    }
}

#[tauri::command]
pub fn check_tectonic() -> bool {
    is_tectonic_available()
}
