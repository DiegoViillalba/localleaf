# Soporte Multi-Ventana en LocalLeaf

A partir de esta actualización, LocalLeaf soporta la gestión de **múltiples ventanas concurrentes**, lo cual permite al usuario abrir y trabajar en varios proyectos de manera simultánea e independiente sin que los estados se mezclen.

## Características

1. **Estado Aislado por Ventana**
   - El estado de Zustand (que maneja qué proyecto está abierto, los archivos en el árbol, y el archivo activo) reside en memoria dentro del contexto Javascript individual de cada ventana. 
   - No se sincronizan a través de `localStorage` las rutas abiertas, garantizando un aislamiento total.

2. **Backend Window Manager**
   - El nuevo módulo `window_manager.rs` maneja un diccionario thread-safe `ProjectWindows` que rastrea la relación entre un `project_path` y el `label` interno de su ventana Webview.
   - Si se intenta abrir un proyecto que *ya está abierto*, el sistema no creará una ventana duplicada, sino que llamará a `window.set_focus()` para traer la ventana existente al frente de forma inteligente.

3. **Invocación Universal (`Ctrl+Shift+N` / `Cmd+Shift+N`)**
   - Desde cualquier ventana de LocalLeaf, el usuario puede presionar este atajo de teclado para invocar el diálogo de selección de carpeta.
   - Una vez escogida una carpeta válida, se envía el comando `open_project_window` al backend para instanciar el nuevo entorno de Tauri.

4. **Títulos Dinámicos**
   - La barra de título nativa del sistema operativo se sincroniza con el nombre de la carpeta del proyecto actual (`workspaceDir`), facilitando identificar rápidamente qué proyecto pertenece a cada ventana cuando se tienen muchas abiertas.

## Flujo Técnico de Inicialización
1. Tauri crea la nueva ventana con la URL: `index.html?project=/ruta/del/nuevo/proyecto`.
2. En el montaje (`App.tsx`), React lee el parámetro `project` de `window.location.search`.
3. Automáticamente dispara `scanProject(...)` para construir el árbol de directorios y setear el `workspaceDir`.
4. El evento `Destroyed` de Tauri se captura en Rust para limpiar el mapa de rastreo de proyectos una vez que el usuario cierra la ventana, liberando así esa ruta para aperturas futuras.
