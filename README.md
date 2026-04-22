# LocalLeaf

Editor LaTeX de escritorio, local-first y open-source. Alternativa a Overleaf que corre completamente en tu máquina.

---

## Stack

| Capa | Tecnología |
|---|---|
| Desktop | **Tauri 2** (Rust) |
| Frontend | Vite 5 + React 18 + TypeScript |
| Editor | CodeMirror 6 + `@codemirror/legacy-modes` (modo `stex`) |
| UI | Tailwind CSS 3 |
| PDF | pdfjs-dist 4 |
| LaTeX | Tectonic CLI |
| Estado | Zustand 4 |
| IA | Cualquier API compatible con OpenAI (streaming SSE) |

---

## Requisitos previos

### Rust + Tauri CLI

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install tauri-cli --version "^2"
```

### Node.js ≥ 18

```bash
nvm install 20 && nvm use 20
```

### Tectonic (motor LaTeX)

```bash
# macOS
brew install tectonic

# Linux — binario precompilado
curl --proto '=https' --tlsv1.2 -fsSL https://drop.Fuller.li/tectonic/install.sh | sh

# Windows — descarga el binario desde https://tectonic-typesetting.github.io
```

> Tectonic descarga los paquetes LaTeX que necesita automáticamente en el primer uso.
> No hace falta instalar TeX Live ni MikTeX.

---

## Instalación

```bash
git clone https://github.com/tu-usuario/localleaf
cd localleaf/frontend
npm install
```

---

## Desarrollo

```bash
# Terminal 1 — Vite (hay que arrancarlo primero)
cd frontend && npm run dev

# Terminal 2 — Tauri + Rust
cd src-tauri && cargo tauri dev
```

El frontend corre en `http://localhost:5173`. Tauri lo envuelve en una ventana nativa.
Cualquier cambio en `.tsx`/`.ts` hace hot-reload instantáneo. Cambios en `.rs` requieren que Cargo recompile (unos segundos).

---

## Build de producción

```bash
cd src-tauri && cargo tauri build
```

El instalador queda en `src-tauri/target/release/bundle/`  
(`.dmg` en macOS, `.AppImage`/`.deb` en Linux, `.msi` en Windows).

---

## Uso

### Flujo básico

1. **Abrir carpeta** — clic en `⊕` en el sidebar
2. **Nuevo proyecto** — clic en `✦` (aparece cuando hay carpeta abierta); escribe el nombre y pulsa Enter. Se crea `nombre/main.tex` con un template listo
3. **Abrir archivo** — clic en cualquier `.tex` en el explorador
4. **Editar** — editor con syntax highlighting para LaTeX
5. **Compilar** — `Cmd/Ctrl+S` o el botón "Compilar"
6. **Ver PDF** — se renderiza automáticamente a la derecha y se recarga con cada compilación
7. **Errores** — panel inferior muestra errores limpios de Tectonic

### AI Assist

1. Clic en `✦ IA` en la barra inferior → panel de configuración
2. Introduce tu **API Key** y **modelo** (por defecto `gpt-4o`)
3. **Selecciona texto** en el editor
4. Clic en **✦ AI Assist** en la barra del editor
5. Los tokens llegan en streaming; elige **Insertar** o **Descartar**

#### Proveedores compatibles

| Proveedor | Provider URL |
|---|---|
| OpenAI | `https://api.openai.com/v1` |
| Groq | `https://api.groq.com/openai/v1` |
| Ollama (local) | `http://localhost:11434/v1` |
| LM Studio | `http://localhost:1234/v1` |

### Auto-save

El documento se guarda automáticamente 5 segundos después del último cambio.
El indicador `●` amarillo en la barra inferior señala cambios sin guardar.

---

## Arquitectura

```
localleaf/
│
├── src-tauri/                      # Backend Rust (proceso nativo)
│   ├── src/
│   │   ├── main.rs                 # Entry point Tauri 2; registra plugins y comandos
│   │   ├── compiler.rs             # Invoca Tectonic CLI; retorna CompileResult
│   │   ├── fs_service.rs           # read_file, read_file_bytes, save_file,
│   │   │                           #   list_directory, open_folder_dialog, create_project
│   │   ├── ai_service.rs           # Streaming SSE hacia cualquier API OpenAI-compatible
│   │   └── error_parser.rs         # Transforma logs de Tectonic en errores legibles
│   ├── capabilities/
│   │   └── default.json            # Permisos Tauri 2 (fs, dialog, shell, scopes)
│   ├── Cargo.toml
│   └── tauri.conf.json             # Ventana, CSP, bundle icons
│
└── frontend/                       # Frontend React (WebView)
    ├── src/
    │   ├── App.tsx                 # Layout raíz: sidebar | editor+errores | pdf
    │   ├── main.tsx                # ReactDOM.createRoot
    │   ├── index.css               # Reset global + Tailwind base
    │   │
    │   ├── types/index.ts          # FileEntry, CompileResult, LaTeXError,
    │   │                           #   AiConfig, AiRequest, CompileStatus, AiStatus
    │   │
    │   ├── store/
    │   │   └── useAppStore.ts      # Zustand — única fuente de verdad del estado
    │   │
    │   ├── lib/
    │   │   └── tauri.ts            # Wrappers tipados de invoke() y listen()
    │   │                           #   (toda la comunicación con Rust pasa por aquí)
    │   │
    │   ├── hooks/
    │   │   ├── useAutoSave.ts      # Debounce 5 s → save automático
    │   │   ├── useCompile.ts       # save → tectonic → setPdfPath con timestamp
    │   │   └── useAiAssist.ts      # Inicia stream, escucha ai-token / ai-done
    │   │
    │   └── components/
    │       ├── editor/
    │       │   └── LatexEditor.tsx # CodeMirror 6, oneDark, stex, Cmd+S compila
    │       ├── pdf/
    │       │   └── PdfViewer.tsx   # Carga PDF como bytes vía Rust; renderiza con pdf.js
    │       ├── sidebar/
    │       │   └── Sidebar.tsx     # Explorador de archivos + botón nuevo proyecto
    │       └── ui/
    │           ├── ErrorPanel.tsx      # Lista errores/warnings de compilación
    │           ├── StatusBar.tsx       # Ruta activa, dirty flag, estado compilación, IA
    │           └── TectonicBanner.tsx  # Aviso si Tectonic no está en PATH
    │
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── tsconfig.json
    └── package.json
```

---

## Cómo fluye la información

```
Usuario edita → setContent() [Zustand]
     │
     ├─ useAutoSave (5 s debounce) ──→ save_file [Rust]
     │
     └─ Cmd+S / botón Compilar
          │
          ▼
     save_file [Rust] → compile_latex [Rust/Tectonic]
          │
          ▼
     CompileResult { success, pdf_path, errors }
          │
          ├─ success → setPdfPath (con ?t=timestamp)
          │                │
          │                ▼
          │           PdfViewer detecta cambio de pdfPath
          │           → read_file_bytes [Rust] → Uint8Array → pdf.js
          │
          └─ error → ErrorPanel muestra errores parseados
```

```
Botón AI Assist
     │
     ▼
stream_ai_assist [Rust] → HTTP POST al LLM (streaming)
     │
     ├─ emit("ai-token", token) ──→ appendAiToken() [Zustand] ──→ AiPanel
     └─ emit("ai-done")         ──→ setAiStatus("done")
```

---

## Añadir un comando nuevo (guía rápida)

1. **Rust** — añade la función en el módulo correspondiente de `src-tauri/src/`:

```rust
#[tauri::command]
pub fn mi_comando(parametro: String) -> Result<String, String> {
    // ...
    Ok(resultado)
}
```

2. **Registra** el comando en `main.rs`:

```rust
.invoke_handler(tauri::generate_handler![
    // ...comandos existentes...
    modulo::mi_comando,
])
```

3. **Frontend** — añade el wrapper en `frontend/src/lib/tauri.ts`:

```typescript
export const miComando = (parametro: string): Promise<string> =>
  invoke("mi_comando", { parametro });
```

4. Úsalo desde cualquier componente o hook importándolo de `../../lib/tauri`.

> Los nombres en `invoke()` son snake_case (nombre de la función Rust).  
> Los parámetros del objeto JS también deben ser camelCase → se convierten a snake_case automáticamente por Tauri.

---

## Permisos Tauri 2

Los permisos van en `src-tauri/capabilities/default.json`, **no** en `tauri.conf.json`.  
Si añades un plugin nuevo (`tauri-plugin-X`), agrega sus permisos ahí:

```json
"permissions": [
  "core:default",
  "fs:default",
  "fs:allow-read-text-file",
  "fs:allow-write-text-file",
  "fs:allow-read-dir",
  "fs:allow-mkdir",
  "fs:allow-exists",
  "fs:scope-home-recursive",
  "fs:scope-document-recursive",
  "fs:scope-desktop-recursive",
  "dialog:default",
  "dialog:allow-open",
  "shell:default"
]
```

---

## Decisiones técnicas relevantes

| Decisión | Motivo |
|---|---|
| PDF cargado como bytes via Rust | El protocolo `asset://` de Tauri tiene problemas de scope en producción; leer bytes desde Rust es confiable en dev y producción |
| `docVersion` en PdfViewer | Sin este contador, re-compilar el mismo doc (mismas páginas, misma página activa) no dispararía el efecto de render en React |
| `@codemirror/legacy-modes` + `stex` | No existe un paquete oficial `@codemirror/lang-latex`; `legacy-modes` adapta los modos de CodeMirror 5 |
| Tauri 2 `WebviewWindow` / `Emitter` | Tauri 2 renombró la API: `get_webview_window()` en vez de `get_window()`, trait `Emitter` para `.emit()` |
| Tectonic en vez de pdflatex | Sin instalación de TeX Live; gestiona paquetes automáticamente; produce PDF directamente |

---

## Ideas para continuar

- [ ] Persistir la API Key de IA (Tauri `store` plugin o keychain del SO)
- [ ] Soporte multi-archivo (`\input` / `\include`) con árbol de proyecto completo
- [ ] Navegación por secciones en el sidebar (parsear `\section`, `\chapter`)
- [ ] Búsqueda en el editor (CodeMirror search panel)
- [ ] Sincronización bidireccional editor ↔ PDF (SyncTeX)
- [ ] Exportar a otros formatos (Pandoc como comando shell)
- [ ] Integración con Git (libgit2 vía Rust)
