use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

const DEFAULT_TEX_TEMPLATE: &str = r#"\documentclass[12pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[spanish]{babel}
\usepackage{amsmath, amssymb}
\usepackage{graphicx}
\usepackage{hyperref}

\title{Mi Documento}
\author{Autor}
\date{\today}

\begin{document}

\maketitle

\section{Introducción}

Escribe aquí tu documento \LaTeX.

\end{document}
"#;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub extension: Option<String>,
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Error al leer '{}': {}", path, e))
}

#[tauri::command]
pub fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| format!("Error al leer '{}': {}", path, e))
}

#[tauri::command]
pub fn save_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Error al crear directorio: {}", e))?;
    }
    fs::write(&path, content).map_err(|e| format!("Error al guardar '{}': {}", path, e))
}

#[tauri::command]
pub fn list_directory(dir_path: String) -> Result<Vec<FileEntry>, String> {
    let entries = fs::read_dir(&dir_path)
        .map_err(|e| format!("Error al listar '{}': {}", dir_path, e))?;

    let mut result: Vec<FileEntry> = entries
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let meta = entry.metadata().ok()?;
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with('.') {
                return None;
            }
            let extension = path.extension().map(|e| e.to_string_lossy().to_string());
            Some(FileEntry {
                name,
                path: path.to_string_lossy().to_string(),
                is_dir: meta.is_dir(),
                extension,
            })
        })
        .collect();

    result.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(result)
}

#[tauri::command]
pub fn create_project(workspace_dir: String, project_name: String) -> Result<String, String> {
    let name = project_name.trim().to_string();
    if name.is_empty() {
        return Err("El nombre del proyecto no puede estar vacío.".to_string());
    }
    if name.contains(['/', '\\', ':', '*', '?', '"', '<', '>', '|']) {
        return Err("El nombre contiene caracteres no válidos.".to_string());
    }

    let project_dir = Path::new(&workspace_dir).join(&name);
    if project_dir.exists() {
        return Err(format!("Ya existe una carpeta con el nombre '{}'.", name));
    }

    fs::create_dir_all(&project_dir)
        .map_err(|e| format!("Error al crear carpeta: {}", e))?;

    let tex_path = project_dir.join("main.tex");
    fs::write(&tex_path, DEFAULT_TEX_TEMPLATE)
        .map_err(|e| format!("Error al crear main.tex: {}", e))?;

    Ok(tex_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn open_folder_dialog(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let path = app_handle.dialog().file().blocking_pick_folder();
    // FilePath implements Display — convert via to_string()
    Ok(path.map(|p| p.to_string()))
}
