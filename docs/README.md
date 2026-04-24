# LocalLeaf — Documentación técnica

Documentación de referencia para el desarrollo activo del proyecto.

## Índice

| Documento | Contenido |
|---|---|
| [architecture.md](./architecture.md) | Visión general del sistema, capas y flujos de datos |
| [commands.md](./commands.md) | Referencia de todos los comandos Tauri (API Rust↔Frontend) |
| [store.md](./store.md) | Estado global Zustand — tipos, acciones, persistencia |
| [components.md](./components.md) | Árbol de componentes, responsabilidades e interfaces |
| [development.md](./development.md) | Workflow de desarrollo, cómo añadir features, troubleshooting |
| [tectonic_integration.md](./tectonic_integration.md) | Sidecar Tectonic, fallback a PATH, warm cache |
| [ai_assistant.md](./ai_assistant.md) | Asistente IA, streaming SSE, inyección de contexto |
| [drag_and_drop.md](./drag_and_drop.md) | Drag & drop de archivos vía API nativa de Tauri |

## Estado del proyecto

**Stack**

| Capa | Tecnología | Versión |
|---|---|---|
| Desktop runtime | Tauri | 2.x |
| Backend | Rust | stable |
| Frontend | React + TypeScript | 18 / 5 |
| Editor | CodeMirror | 6.x |
| PDF | pdfjs-dist | 4.x |
| Estado | Zustand (con `persist`) | 4.x |
| UI | Tailwind CSS | 3.x |
| Paneles | react-resizable-panels | 4.x |
| Markdown | react-markdown | 10.x |
| LaTeX engine | Tectonic CLI | system / sidecar |

**Módulos Rust**

| Archivo | Responsabilidad |
|---|---|
| `main.rs` | Entry point, registro de plugins y comandos, check de Tectonic al inicio |
| `compiler.rs` | Invocación de Tectonic, parsing de resultado, status y warm-cache |
| `fs_service.rs` | CRUD de archivos/carpetas, escaneo de árbol de proyecto |
| `ai_service.rs` | Streaming SSE hacia cualquier API OpenAI-compatible, fetch de modelos |
| `error_parser.rs` | Transforma logs crudos de Tectonic en errores legibles |
