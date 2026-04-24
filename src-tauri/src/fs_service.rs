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
    pub children: Option<Vec<FileEntry>>,
}

// ─── Commands ─────────────────────────────────────────────────────────────────

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

/// Returns a flat list of the immediate children of a directory.
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
                children: None,
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

/// Returns the full recursive directory tree rooted at `dir_path`.
/// Hidden files/dirs (starting with '.') and common build artifacts are excluded.
#[tauri::command]
pub fn scan_project(dir_path: String) -> Result<FileEntry, String> {
    scan_dir(Path::new(&dir_path), 0)
        .map_err(|e| format!("Error escaneando proyecto: {}", e))
}

fn scan_dir(dir: &Path, depth: u32) -> std::io::Result<FileEntry> {
    // Guard against accidental deep recursion (symlink loops, etc.)
    if depth > 10 {
        return Ok(FileEntry {
            name: dir.file_name().unwrap_or_default().to_string_lossy().to_string(),
            path: dir.to_string_lossy().to_string(),
            is_dir: true,
            extension: None,
            children: Some(vec![]),
        });
    }

    let name = dir
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| dir.to_string_lossy().to_string());

    let mut children: Vec<FileEntry> = fs::read_dir(dir)?
        .filter_map(|e| e.ok())
        .filter_map(|e| {
            let path = e.path();
            let entry_name = e.file_name().to_string_lossy().to_string();

            // Skip hidden and common build/cache dirs
            if entry_name.starts_with('.') {
                return None;
            }
            if matches!(
                entry_name.as_str(),
                "target" | "node_modules" | "_minted*" | "__pycache__"
            ) {
                return None;
            }

            let meta = e.metadata().ok()?;

            if meta.is_dir() {
                scan_dir(&path, depth + 1).ok()
            } else {
                let extension = path.extension().map(|e| e.to_string_lossy().to_string());
                Some(FileEntry {
                    name: entry_name,
                    path: path.to_string_lossy().to_string(),
                    is_dir: false,
                    extension,
                    children: None,
                })
            }
        })
        .collect();

    children.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(FileEntry {
        name,
        path: dir.to_string_lossy().to_string(),
        is_dir: true,
        extension: None,
        children: Some(children),
    })
}

#[tauri::command]
pub fn create_file(dir_path: String, name: String) -> Result<String, String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("El nombre no puede estar vacío.".to_string());
    }
    let path = Path::new(&dir_path).join(&name);
    if path.exists() {
        return Err(format!("Ya existe '{}'.", name));
    }
    fs::write(&path, "").map_err(|e| format!("Error al crear '{}': {}", name, e))?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn create_folder(dir_path: String, name: String) -> Result<String, String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("El nombre no puede estar vacío.".to_string());
    }
    let path = Path::new(&dir_path).join(&name);
    if path.exists() {
        return Err(format!("Ya existe '{}'.", name));
    }
    fs::create_dir_all(&path)
        .map_err(|e| format!("Error al crear carpeta '{}': {}", name, e))?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn rename_entry(old_path: String, new_name: String) -> Result<String, String> {
    let new_name = new_name.trim().to_string();
    if new_name.is_empty() {
        return Err("El nombre no puede estar vacío.".to_string());
    }
    let old = Path::new(&old_path);
    let new_path = old
        .parent()
        .ok_or("No se puede renombrar el directorio raíz.")?
        .join(&new_name);
    if new_path.exists() {
        return Err(format!("Ya existe '{}'.", new_name));
    }
    fs::rename(&old, &new_path).map_err(|e| format!("Error al renombrar: {}", e))?;
    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn delete_entry(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| format!("Error al eliminar carpeta: {}", e))
    } else {
        fs::remove_file(p).map_err(|e| format!("Error al eliminar archivo: {}", e))
    }
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
    Ok(path.map(|p| p.to_string()))
}

#[tauri::command]
pub fn import_files(source_paths: Vec<String>, dest_dir: String) -> Result<(), String> {
    let dest_path = Path::new(&dest_dir);
    if !dest_path.exists() {
        return Err(format!("El directorio destino '{}' no existe.", dest_dir));
    }

    for source in source_paths {
        let src_path = Path::new(&source);
        if !src_path.exists() {
            continue; // Ignore non-existent files
        }

        if let Some(file_name) = src_path.file_name() {
            let target_path = dest_path.join(file_name);
            
            // Only copy files, not directories (for simplicity, we don't handle recursive folder drop yet)
            if src_path.is_file() {
                fs::copy(&src_path, &target_path)
                    .map_err(|e| format!("Error al copiar '{}': {}", file_name.to_string_lossy(), e))?;
            }
        }
    }

    Ok(())
}
