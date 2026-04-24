# Arquitectura de Drag and Drop (Arrastrar y Soltar)

En LocalLeaf, los usuarios pueden importar imágenes, PDFs y archivos fuente (`.tex`) simplemente arrastrándolos desde el explorador de archivos de su sistema operativo hacia el panel de navegación (File Tree).

Esta característica combina lo mejor de la API nativa de Tauri y los componentes de React para proporcionar una experiencia de usuario fluida e integración de archivos de manera segura.

## 1. Captura del Evento (Tauri v2 API)

Tauri proporciona un *listener* global para la ventana/webview activa que intercepta eventos de archivos arrojados. Usamos `getCurrentWebview().onDragDropEvent` para suscribirnos a estos eventos de manera nativa.

```typescript
getCurrentWebview().onDragDropEvent((event) => {
  if (event.payload.type === "enter" || event.payload.type === "over") {
    setIsDraggingOver(true);
  } else if (event.payload.type === "leave") {
    setIsDraggingOver(false);
  } else if (event.payload.type === "drop") {
    setIsDraggingOver(false);
    const paths = event.payload.paths; // ¡Rutas absolutas nativas!
    // ... invocar comando import_files
  }
});
```

### ¿Por qué no usar HTML5 `onDrop` directamente?
La API estándar de HTML5 (Drag and Drop de navegadores) por motivos de seguridad oculta la ruta real del archivo en el sistema de archivos del usuario. Solo provee objetos `File` emulados, lo cual dificulta que Rust mueva o copie el archivo original. 
Al usar la API nativa de Tauri, recibimos las **rutas absolutas** (`/Users/nombre/Descargas/imagen.png`), permitiendo operaciones de I/O limpias desde el backend.

## 2. Experiencia de Usuario (UI)

El evento Tauri `enter` y `over` actualiza el estado `isDraggingOver` en el componente `FileTreePanel`. Esto dispara una capa decorativa (Overlay) que se posiciona por encima del explorador de archivos actual:

- Se oscurece ligeramente el fondo mediante `backdrop-blur` y una opacidad en negro/gris oscuro.
- Se muestra un borde punteado con acentos color esmeralda (verde).
- Aparece un ícono flotante indicando "Soltar para importar".

Esto confirma visualmente que el usuario está interactuando correctamente con la aplicación.

## 3. Backend: Integración Segura (`import_files`)

Una vez que el usuario suelta los archivos (`type === "drop"`), el array de rutas es enviado por invocación IPC al comando `import_files` programado en Rust (`src-tauri/src/fs_service.rs`):

```rust
#[tauri::command]
pub fn import_files(source_paths: Vec<String>, dest_dir: String) -> Result<(), String> {
    let dest_path = Path::new(&dest_dir);
    for source in source_paths {
        let src_path = Path::new(&source);
        if let Some(file_name) = src_path.file_name() {
            let target_path = dest_path.join(file_name);
            if src_path.is_file() {
                fs::copy(&src_path, &target_path)?;
            }
        }
    }
    Ok(())
}
```

Rust itera sobre las rutas proveídas:
1. Extrae el nombre final del archivo (ej. `imagen.png`).
2. Lo concatena a la ruta del "Workspace" actual de LocalLeaf (`dest_dir`).
3. Ejecuta una copia del sistema (`fs::copy`), asegurándose de no alterar los archivos originales del usuario.

## 4. Finalización

Si la copia en Rust resulta exitosa, el frontend ejecuta inmediatamente la recarga del árbol de archivos (`refresh()`). El nuevo archivo se renderizará al instante en la lista de recursos disponibles de la barra lateral, preparado para previsualizarse o abrirse en el editor CodeMirror.
