<div align="center">

<img src="docs/icon.png" alt="LocalLeaf" width="80" height="80" />

# LocalLeaf

**Editor LaTeX de escritorio, local-first y open-source.**  
Alternativa a Overleaf que corre completamente en tu máquina — sin nube, sin suscripción, sin límites.

[![Última versión](https://img.shields.io/github/v/release/DiegoViillalba/localleaf?include_prereleases&style=flat-square&color=34d399&label=versión)](https://github.com/DiegoViillalba/localleaf/releases/latest)
[![Plataformas](https://img.shields.io/badge/plataformas-macOS%20·%20Windows%20·%20Linux-34d399?style=flat-square)](https://github.com/DiegoViillalba/localleaf/releases)
[![Estado](https://img.shields.io/badge/estado-alfa%20privada-f59e0b?style=flat-square)](https://github.com/DiegoViillalba/localleaf/releases)
[![Licencia](https://img.shields.io/github/license/DiegoViillalba/localleaf?style=flat-square&color=71717a)](LICENSE)

[**Descargar**](https://github.com/DiegoViillalba/localleaf/releases/latest) · [**Reportar un bug**](https://github.com/DiegoViillalba/localleaf/issues/new) · [**Página web**](https://diegoviillalba.github.io/localleaf)

</div>

---

## ¿Qué es LocalLeaf?

LocalLeaf es un editor LaTeX nativo para macOS, Windows y Linux construido con **Tauri 2 + Rust + React**. Compila documentos con **Tectonic** (sin instalar TeX Live) y muestra el PDF directamente en la app. Todo el procesamiento ocurre en tu máquina — tus documentos nunca salen de ella.

### Características principales

| | |
|---|---|
| 🌿 **100% local** | Tus archivos y tu privacidad son tuyos. Sin servidores, sin sincronización forzada. |
| ⚡ **Tectonic integrado** | Motor LaTeX moderno incluido en el instalador. No necesitas TeX Live ni MikTeX. |
| 📄 **Vista previa instantánea** | PDF renderizado con pdf.js, actualizado automáticamente tras cada compilación. |
| 🤖 **IA integrada** | Compatible con OpenAI, Groq, Ollama y cualquier API OpenAI-compatible (tu propia key). |
| 📚 **Gestión de bibliografía** | Panel visual para editar archivos `.bib` — importa referencias desde DOI, arXiv o ISBN. |
| 🗂️ **Multi-archivo** | Explorador de proyectos completo con árbol de archivos, búsqueda y navegación por esquema. |
| 🔄 **Control de versiones** | Historial de versiones integrado con Git (init, commit, log, diff, push/pull). |
| 🌙 **Dark mode nativo** | Interfaz oscura optimizada para trabajo prolongado. |

---

## Para testers — Instalación rápida

> **Alfa privada.** Esta versión puede contener bugs y funciones incompletas. Tu feedback es lo más valioso que puedes aportar.

### 1. Descarga el instalador

Elige tu plataforma en la [página de releases](https://github.com/DiegoViillalba/localleaf/releases/latest):

| Plataforma | Archivo |
|---|---|
| macOS Apple Silicon (M1–M4) | `LocalLeaf_x.x.x_aarch64.dmg` |
| macOS Intel | `LocalLeaf_x.x.x_x64.dmg` |
| Windows 10/11 | `LocalLeaf_x.x.x_x64-setup.exe` |
| Linux (AppImage) | `LocalLeaf_x.x.x_amd64.AppImage` |
| Linux (Debian/Ubuntu) | `localleaf_x.x.x_amd64.deb` |

### 2. Instala y abre

**macOS** — arrastra la app a `/Applications`. Si Gatekeeper bloquea la apertura:
```
Ajustes del sistema → Privacidad y Seguridad → Abrir igualmente
```
O por terminal:
```bash
xattr -dr com.apple.quarantine /Applications/LocalLeaf.app
```

**Windows** — ejecuta el `.exe` como instalador normal. Si SmartScreen lo bloquea, haz clic en "Más información → Ejecutar de todas formas".

**Linux (AppImage)**:
```bash
chmod +x LocalLeaf_*.AppImage
./LocalLeaf_*.AppImage
```

**Linux (deb)**:
```bash
sudo dpkg -i localleaf_*.deb
```

### 3. Reporta bugs

Por favor usa [GitHub Issues](https://github.com/DiegoViillalba/localleaf/issues/new) e incluye:
- Sistema operativo y versión
- Qué acción realizaste
- Qué esperabas que pasara vs. qué pasó
- Logs si los hay (menú de compilación en la barra lateral)

---

## Uso básico

```
1. Abrir carpeta   → ícono de carpeta en la barra lateral
2. Nuevo proyecto  → botón "+" → escribe el nombre → Enter
                     (crea main.tex con template listo)
3. Editar          → editor con syntax highlighting LaTeX
4. Compilar        → Cmd/Ctrl+S o botón "Compilar"
5. Ver PDF         → panel derecho, actualización automática
6. Bibliografía    → pestaña de libro en la barra lateral
7. IA              → pestaña ✦ → configura tu API key
```

### Asistente IA

Funciona con cualquier API compatible con OpenAI:

| Proveedor | URL base |
|---|---|
| OpenAI | `https://api.openai.com/v1` |
| Groq | `https://api.groq.com/openai/v1` |
| Ollama (local) | `http://localhost:11434/v1` |
| LM Studio | `http://localhost:1234/v1` |
| Anthropic (via proxy) | tu endpoint compatible |

---

## Para desarrolladores

### Requisitos

- **Rust** ≥ 1.77 + `cargo`
- **Node.js** ≥ 18
- **Tectonic** (solo para compilar LaTeX en dev — la app lo incluye en producción)

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Node.js (con nvm)
nvm install 20 && nvm use 20

# Tectonic
brew install tectonic           # macOS
cargo install tectonic          # cualquier plataforma

# Linux — dependencias del sistema
sudo apt-get install libgtk-3-dev libwebkit2gtk-4.1-dev \
  libayatana-appindicator3-dev librsvg2-dev patchelf
```

### Setup

```bash
git clone https://github.com/DiegoViillalba/localleaf
cd localleaf/frontend && npm install
```

### Desarrollo

```bash
# Terminal 1 — frontend Vite (arrancar primero)
cd frontend && npm run dev

# Terminal 2 — Tauri + Rust
cd .. && cargo tauri dev
```

Cambios en `.tsx`/`.ts` → hot-reload instantáneo.  
Cambios en `.rs` → Cargo recompila (unos segundos).

### Build de producción

```bash
cd frontend && npm run build
cd .. && cargo tauri build
```

Instaladores en `src-tauri/target/release/bundle/`.

---

## Arquitectura

```
localleaf/
├── src-tauri/                    # Backend Rust
│   └── src/
│       ├── main.rs               # Entry point — registra plugins y comandos
│       ├── compiler.rs           # Invoca Tectonic; retorna CompileResult
│       ├── fs_service.rs         # Operaciones de archivo (read, save, scan…)
│       ├── ai_service.rs         # Streaming SSE → LLM compatible con OpenAI
│       ├── bib_service.rs        # Fetch BibTeX desde DOI / arXiv / ISBN
│       ├── git_service.rs        # Operaciones Git (init, commit, log, diff…)
│       └── error_parser.rs       # Parsea logs de Tectonic → errores legibles
│
└── frontend/                     # React + TypeScript (WebView)
    └── src/
        ├── store/useAppStore.ts  # Zustand — estado global único
        ├── lib/
        │   ├── tauri.ts          # Wrappers tipados de invoke() y listen()
        │   └── bibtex.ts         # Parser/serializer BibTeX puro en TypeScript
        ├── hooks/                # useAutoSave, useCompile, useAiAssist…
        └── components/
            ├── editor/           # CodeMirror 6 + LaTeX mode
            ├── pdf/              # Visor PDF con pdf.js
            └── sidebar/          # Explorador, búsqueda, bibliografía, IA, Git…
```

### Flujo de compilación

```
Cmd+S
  → save_file [Rust]
  → compile_latex [Rust → Tectonic CLI]
  → CompileResult { success, pdf_path, errors }
      ├── success → setPdfPath (con ?t=timestamp para bust de caché)
      │               → PdfViewer recarga el PDF
      └── error   → ErrorPanel muestra errores parseados
```

### Añadir un comando Rust nuevo

```rust
// 1. src-tauri/src/mi_modulo.rs
#[tauri::command]
pub async fn mi_comando(param: String) -> Result<String, String> {
    Ok(format!("hola {}", param))
}

// 2. main.rs — registrar
.invoke_handler(tauri::generate_handler![mi_modulo::mi_comando])

// 3. frontend/src/lib/tauri.ts — wrapper
export const miComando = (param: string): Promise<string> =>
  invoke("mi_comando", { param });
```

---

## Decisiones técnicas

| Decisión | Motivo |
|---|---|
| **Tectonic** en vez de pdflatex | Sin instalación de TeX Live; gestiona paquetes automáticamente |
| **pdf.js con `?url` worker** | `new URL(…, import.meta.url)` falla en el WebView de Tauri en producción; el import `?url` de Vite resuelve esto en build time |
| **BibTeX en TypeScript puro** | Parser propio evita dependencias pesadas; control total sobre serialización y validación |
| **Fetch BibTeX desde Rust** | Las llamadas a DOI/arXiv/ISBN desde el WebView fallan por CORS; desde Rust no hay restricciones |
| **`readFileBytes` para PDFs** | El protocolo `asset://` tiene problemas de scope en producción; leer bytes desde Rust es fiable |

---

## Roadmap

- [ ] Firma de código (macOS notarization + Windows Authenticode)
- [ ] SyncTeX — navegación bidireccional editor ↔ PDF
- [ ] Persistencia de API Key en keychain del SO
- [ ] Soporte `\input` / `\include` en el explorador
- [ ] Exportar a otros formatos vía Pandoc
- [ ] Autocompletado de referencias `\cite{…}` desde el `.bib`
- [ ] Temas de color adicionales para el editor

---

<div align="center">

Construido con Tauri, Rust, React y ☕

[GitHub](https://github.com/DiegoViillalba/localleaf) · [Issues](https://github.com/DiegoViillalba/localleaf/issues) · [Releases](https://github.com/DiegoViillalba/localleaf/releases)

</div>
