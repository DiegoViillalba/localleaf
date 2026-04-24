# Arquitectura de LocalLeaf

> Documento actualizado. Refleja el estado del proyecto tras la implementación de soporte multi-archivo, sidebar estilo Overleaf y asistente IA.

LocalLeaf es un editor de LaTeX moderno y ligero, diseñado para funcionar nativamente en el escritorio (macOS, Windows, Linux) sin depender de instalaciones pesadas de TeX Live. Utiliza una arquitectura dividida entre un **Frontend (React)** y un **Backend (Rust + Tauri)**.

## Vista General del Stack

- **Frontend:** React, TypeScript, TailwindCSS, Zustand (Manejo de estado global), CodeMirror 6 (Editor de código).
- **Backend:** Rust, Tauri v2.
- **Motor LaTeX:** Tectonic (empaquetado como Sidecar).

---

## 1. Frontend (Capa de Presentación)

El frontend está estructurado para ofrecer un entorno de edición altamente responsivo y persistente.

### Manejo de Estado (`useAppStore.ts`)
Toda la lógica de estado global reside en Zustand. Esto previene el *prop-drilling* y centraliza la configuración de la app.
- **`layout`**: Guarda los anchos de los paneles (`react-resizable-panels`), permitiendo que el usuario pueda ocultar o ajustar libremente el tamaño del explorador de archivos, el editor y el visor PDF.
- **`content` y `originalContent`**: El núcleo del guardado automático. Para evitar corrupciones de archivos (como sobreescribir imágenes al previsualizarlas), el estado compara estrictamente `content !== originalContent` antes de marcar el estado como "sucio" (`isDirty`).
- **`settings`**: Mantiene las configuraciones persistentes (como los estados del caché de LaTeX y preferencias futuras) para alimentar los modales y barras de estado.

### Interfaz Híbrida (`App.tsx`)
La interfaz utiliza componentes colapsables y modales que flotan sobre el contenido principal:
- **Global Settings Modal:** Un panel central basado en un patrón *Maestro-Detalle* (Drill-down) que controla las opciones del entorno, y se sobrepone (`z-50`, `backdrop-blur`) al editor sin afectar el layout interno.
- **File Previews:** El editor es capaz de detectar si un archivo es de código `.tex` o un medio binario (`.pdf`, `.png`), e intercambiar dinámicamente entre CodeMirror y previsualizaciones HTML (`iframe`, `img`) permitidas mediante los protocolos seguros de Tauri (`asset://`).

---

## Diagrama de componentes

```
┌─────────────────────────────────────────────────────────┐
│                   Proceso WebView (UI)                  │
│                                                         │
│  App.tsx (layout resizable en 3 paneles)                │
│  ├── Sidebar                                            │
│  │   ├── SidebarToolbar  (tabs verticales)              │
│  │   └── Panels activos según sidebarTab:               │
│  │       FileTreePanel / SearchPanel / LogsPanel /      │
│  │       OutlinePanel / AiChatPanel                     │
│  ├── LatexEditor (CodeMirror 6 + autocompletion + lint) │
│  └── PdfViewer (pdf.js via Uint8Array desde Rust)       │
│                                                         │
│  Estado global: Zustand → useAppStore                   │
│  IPC wrapper:   src/lib/tauri.ts                        │
└────────────────────────┬────────────────────────────────┘
                         │  invoke() / listen()
                         │  Tauri IPC (sin HTTP, sin CORS)
┌────────────────────────┴────────────────────────────────┐
│                   Proceso Rust (backend)                │
│  compiler.rs    — invoca Tectonic, parsea resultado     │
│  fs_service.rs  — CRUD archivos, árbol recursivo        │
│  ai_service.rs  — streaming SSE hacia API LLM           │
│  error_parser.rs— normaliza logs de Tectonic            │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Backend (Capa Nativa / Rust)

Tauri nos permite interactuar con el sistema operativo de manera eficiente. Todo el backend se encuentra en la carpeta `src-tauri`.

### Gestión del Sistema de Archivos (`fs_service.rs`)
La manipulación de archivos está estrictamente regulada. Exponemos comandos seguros a React para que pueda consultar árboles de directorios, abrir archivos y guardar cambios.

Comandos principales:
- `scan_project` — devuelve el árbol recursivo completo (`FileEntry` con `children`)
- `read_file_bytes` — devuelve el contenido binario para la visualización de PDFs
- `create_project` — crea carpeta + `main.tex` con plantilla completa
- `import_files` — copia archivos arrastrados al workspace

### Motor de Compilación (`compiler.rs`)
- **Sidecar con fallback:** En producción usa el binario de Tectonic empaquetado; en desarrollo cae en el binario del sistema (ver [tectonic_integration.md](./tectonic_integration.md)).
- **Multi-archivo:** Tectonic se invoca con `.current_dir(output_dir)`, lo que resuelve `\input` y `\include` correctamente desde el directorio del proyecto.
- **rootFilePath vs activeFilePath:** El archivo activo (el que se edita) puede ser distinto del archivo raíz que se compila. `useCompile` guarda el activo y compila el raíz.
- **Parsing de Errores:** `error_parser.rs` normaliza los logs de Tectonic extrayendo línea, mensaje y severidad.

### Lectura de PDF — por qué no `asset://`

El protocolo `asset://` de Tauri requiere configurar un scope explícito por path en `tauri.conf.json` y se comporta diferente en dev vs producción. En su lugar, `read_file_bytes` devuelve el PDF como `Vec<u8>` y el frontend lo convierte en `Uint8Array` para `pdfjsLib.getDocument({ data })`. Esto funciona de forma idéntica en ambos entornos.

### Streaming de IA (`ai_service.rs`)
Acepta historial de chat completo (`Vec<ChatMessage>`) y contexto del documento. Usa `reqwest` + `futures_util::StreamExt` para parsear SSE línea a línea y emitir eventos `ai-token`/`ai-done` hacia la WebView mediante `window.emit()`.
