# Guía de desarrollo

---

## Setup inicial

### Requisitos

| Herramienta | Versión mínima | Cómo instalar |
|---|---|---|
| Rust | stable | `rustup update stable` |
| Node.js | 18+ | `brew install node` / nvm |
| Tectonic | cualquiera | `brew install tectonic` |
| Tauri CLI | 2.x | `cargo install tauri-cli` |

### Primera vez

```bash
git clone <repo>
cd localleaf

# Dependencias frontend
cd frontend && npm install && cd ..

# Verificar Rust
cargo check --manifest-path src-tauri/Cargo.toml
```

### Arrancar en desarrollo

```bash
cargo tauri dev
```

Esto lanza:
1. El servidor Vite (frontend en hot-reload)
2. El proceso Rust compilado en modo debug
3. La ventana WebView con las DevTools habilitadas

> **Nota:** En dev, Tectonic se busca en el PATH del sistema. Asegúrate de tener `tectonic --version` funcionando. El sidecar empaquetado solo se usa en producción.

### Build de producción (Compilación Manual)

Para generar una nueva versión empaquetada (App de macOS, ejecutable de Windows, etc.), puedes compilar el proyecto manualmente ejecutando:

```bash
cargo tauri build
```

**Nota:** La primera vez que compiles puede tardar varios minutos ya que descargará y compilará todas las dependencias de Rust y empaquetará el frontend.

El binario final (junto con el instalador `.dmg` si estás en macOS o `.msi`/`.exe` en Windows) aparecerá en `src-tauri/target/release/bundle/`.

---

## Estructura del proyecto

```
localleaf/
├── frontend/                 # React + TypeScript
│   ├── src/
│   │   ├── App.tsx           # Layout raíz
│   │   ├── store/            # Zustand store
│   │   ├── lib/tauri.ts      # Wrappers IPC
│   │   ├── hooks/            # useCompile, useClickOutside
│   │   ├── components/
│   │   │   ├── editor/       # LatexEditor, completions, linter
│   │   │   ├── pdf/          # PdfViewer
│   │   │   ├── sidebar/      # Sidebar, toolbar, panels, FileItem, ContextMenu
│   │   │   ├── settings/     # SettingsModal
│   │   │   └── ui/           # TectonicBanner, ResizeHandle, StatusBar
│   │   └── types/            # Interfaces compartidas
│   ├── vite.config.ts
│   └── package.json
├── src-tauri/
│   ├── src/
│   │   ├── main.rs           # Entry point, registro de comandos
│   │   ├── compiler.rs       # Tectonic integration
│   │   ├── fs_service.rs     # Filesystem CRUD
│   │   ├── ai_service.rs     # LLM streaming
│   │   └── error_parser.rs   # Log parsing
│   ├── capabilities/
│   │   └── default.json      # Permisos Tauri (fs, dialog, shell)
│   ├── bin/                  # Sidecars de Tectonic (producción)
│   └── tauri.conf.json
└── docs/
```

---

## Cómo añadir un nuevo comando Tauri

### 1. Definir la función Rust

En el módulo correspondiente (`fs_service.rs`, `compiler.rs`, etc.):

```rust
#[tauri::command]
pub fn my_command(param: String) -> Result<String, String> {
    // lógica aquí
    Ok(result)
}
```

Para comandos async:

```rust
#[tauri::command]
pub async fn my_async_command(app: tauri::AppHandle, param: String) -> Result<String, String> {
    // lógica async
    Ok(result)
}
```

### 2. Registrar en `main.rs`

```rust
.invoke_handler(tauri::generate_handler![
    // ... comandos existentes ...
    fs_service::my_command,
])
```

### 3. Añadir wrapper TypeScript en `src/lib/tauri.ts`

```typescript
export const myCommand = (param: string): Promise<string> =>
  invoke("my_command", { param });
```

### 4. Documentar en `docs/commands.md`

Añadir la firma TypeScript, parámetros y comportamiento esperado.

---

## Cómo añadir estado al store

### 1. Declarar el campo en la interfaz `AppState`

```typescript
// en useAppStore.ts
interface AppState {
  myNewField: string | null;
  setMyNewField: (value: string | null) => void;
}
```

### 2. Inicializar y definir la acción

```typescript
// dentro de create()(persist((set) => ({
myNewField: null,
setMyNewField: (value) => set({ myNewField: value }),
```

### 3. Persistir si es necesario

```typescript
partialize: (state) => ({
  layout: state.layout,
  aiConfig: state.aiConfig,
  settings: state.settings,
  myNewField: state.myNewField, // añadir aquí
})
```

---

## Cómo añadir un nuevo panel al sidebar

### 1. Añadir el tipo a `SidebarTab`

```typescript
// useAppStore.ts
export type SidebarTab = "files" | "search" | "logs" | "outline" | "ai" | "mypanel";
```

### 2. Crear el componente panel

```
frontend/src/components/sidebar/panels/MyPanel.tsx
```

### 3. Registrar en `Sidebar.tsx`

```typescript
{sidebarTab === "mypanel" && <MyPanel />}
```

### 4. Añadir tab en `SidebarToolbar.tsx`

Añadir un objeto al array de `tabs`:

```typescript
{
  id: "mypanel" as SidebarTab,
  label: "Mi panel",
  icon: <svg>...</svg>,
}
```

---

## Troubleshooting frecuente

### El PDF no se actualiza al recompilar

Verificar que `useCompile` está llamando a `setPdfPath` con un timestamp:

```typescript
setPdfPath(`${result.pdf_path}?t=${Date.now()}`);
```

`PdfViewer` detecta el cambio en `pdfPath` y recarga. El timestamp garantiza que el valor siempre es distinto incluso si el path del archivo no cambia.

### Tectonic no se encuentra en dev

```bash
which tectonic   # debe devolver una ruta
tectonic --version
```

Si no está instalado: `brew install tectonic` (macOS) o `cargo install tectonic`.

### Error de compilación Rust: `feature not enabled`

Verificar que los plugins están registrados en `main.rs` en el orden correcto:

```rust
.plugin(tauri_plugin_fs::init())
.plugin(tauri_plugin_dialog::init())
.plugin(tauri_plugin_shell::init())
```

### El árbol de archivos no se actualiza tras crear/renombrar

Llamar a `refresh()` en `FileTreePanel` tras cualquier operación que modifique el árbol. La función hace `scanProject(workspaceDir)` y llama a `setProjectTree(tree)`.

### Warning de Rust: variant never constructed

Añadir `#[allow(dead_code)]` al enum o variant en cuestión. Ejemplo en `error_parser.rs`:

```rust
#[allow(dead_code)]
pub enum ErrorKind {
    Error,
    Warning,
    Info, // reservado para uso futuro
}
```

### Build de producción falla: sidecar no encontrado

Los binarios de Tectonic deben estar en `src-tauri/bin/` con el nombre correcto para la plataforma:

- `tectonic-aarch64-apple-darwin` (Mac Apple Silicon)
- `tectonic-x86_64-apple-darwin` (Mac Intel)
- `tectonic-x86_64-pc-windows-msvc.exe` (Windows)

Ver [tectonic_integration.md](./tectonic_integration.md) para más detalles.

---

## Convenciones del proyecto

- **Rust:** snake_case, errores como `Result<T, String>` (mensaje en español para el usuario).
- **TypeScript:** camelCase, interfaces con `PascalCase`, props explícitas (sin `...rest` salvo justificación).
- **Tauri IPC:** nombres de comandos en snake_case en Rust, camelCase en el wrapper TypeScript.
- **Zustand:** un store único (`useAppStore`), selectors inline en los componentes, acciones separadas de estado.
- **Componentes:** responsabilidad única — los paneles del sidebar no hacen IPC directamente, usan `lib/tauri.ts`.
- **No asset://** para archivos grandes: usar `readFileBytes` + `Uint8Array` en su lugar.
