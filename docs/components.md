# Árbol de componentes

**Directorio raíz:** `frontend/src/components/`

---

## Mapa general

```
App.tsx
├── TectonicBanner          (banner de advertencia global)
├── SettingsModal           (overlay global de ajustes)
└── PanelGroup (react-resizable-panels)
    ├── Panel → Sidebar
    │   ├── SidebarToolbar  (tabs verticales)
    │   └── [panel activo según sidebarTab]
    │       ├── FileTreePanel
    │       ├── SearchPanel
    │       ├── LogsPanel
    │       ├── OutlinePanel
    │       └── AiChatPanel
    ├── ResizeHandle
    ├── Panel → LatexEditor
    └── Panel → PdfViewer
```

---

## Componentes

### `App.tsx`

Layout raíz. Responsabilidades:

- Inicializa los tres paneles redimensionables con `react-resizable-panels`.
- Sincroniza el layout entre `PanelImperativeHandle` y el store Zustand.
- Escucha el evento Tauri `tectonic-missing` al montar y actualiza el store.
- Registra atajos de teclado globales: `Cmd+S` (guardar), `Ctrl+G` (saltar a línea).
- Renderiza `SettingsModal` como overlay global (fuera del árbol de paneles).

---

### `sidebar/Sidebar.tsx`

Contenedor del sidebar. Sin lógica propia: lee `sidebarTab` del store y renderiza el panel correspondiente junto a `SidebarToolbar`.

---

### `sidebar/SidebarToolbar.tsx`

Barra vertical con 5 tabs (icons SVG) y el botón de ajustes en la parte inferior.

| Tab | Icono | Cambia `sidebarTab` a |
|---|---|---|
| Archivos | carpeta | `"files"` |
| Búsqueda | lupa | `"search"` |
| Logs | terminal | `"logs"` |
| Esquema | lista | `"outline"` |
| IA | chispa | `"ai"` |

El botón de ajustes llama a `setIsSettingsOpen(true)`.

---

### `sidebar/panels/FileTreePanel.tsx`

Panel de exploración de archivos del proyecto.

**Funcionalidades:**
- Botones de cabecera: refrescar árbol, crear archivo, crear carpeta.
- Entrada inline `NewItemInput` para escribir el nombre antes de crear.
- Drag & drop nativo vía `getCurrentWebview().onDragDropEvent` → `invoke("import_files")`.
- Overlay visual cuando el usuario arrastra archivos sobre el panel.
- Renderiza el árbol recursivo usando `ConnectedFileItem` para cada nodo.

**Interacción con el store:** lee `workspaceDir` y `projectTree`; llama a `setProjectTree` tras refrescar o crear entradas.

---

### `sidebar/FileItem.tsx`

Exporta dos componentes:

**`FileIcon`** — Determina el icono según extensión:

| Extensión | Icono |
|---|---|
| `.tex` | τ |
| `.bib` | β |
| `.pdf` | icono PDF |
| `.png` / `.jpg` / `.svg` | icono imagen |
| otros | S |

**`ConnectedFileItem`** — Wrapper con estado de rename. Gestiona el input inline de edición de nombre y confirma con `invoke("rename_entry")`.

**`FileItem`** — Componente de presentación pura. Acepta props:
- `entry: FileEntry` — nodo del árbol
- `depth: number` — indentación visual
- `isActive: boolean` — resaltado si es el archivo activo
- `onSelect: (entry) => void`
- `onRename: () => void`
- `onContextMenu: (e, entry) => void`

Los directorios muestran un chevron y expanden/colapsan sus hijos.

---

### `sidebar/ContextMenu.tsx`

Menú contextual flotante (posición fija calculada para no salirse del viewport).

**Dos fases:**
1. **Menú principal:** "Establecer como raíz" / "Renombrar" / "Eliminar"
2. **Confirmación de eliminación:** botones Cancelar / Confirmar

Se cierra al hacer click fuera o presionar Escape (hook `useClickOutside`).

---

### `sidebar/panels/SearchPanel.tsx`

Búsqueda de texto en todos los archivos `.tex` del proyecto.

- Lee `projectTree` para obtener todos los archivos `.tex` recursivamente.
- Invoca `readFile` para cada archivo y busca la query con `indexOf`.
- Muestra resultados como: `nombre_archivo.tex : línea N — fragmento`.
- Click en resultado → `openFile` + `setEditorJumpLine(línea)`.

---

### `sidebar/panels/LogsPanel.tsx`

Muestra el resultado de la última compilación.

- Indicador de estado: compilando / éxito / error con color.
- Lista de errores estructurados del `compileResult`.
- Toggle para mostrar el `raw_log` completo.
- Botón "Solucionar con IA" → `setPendingAiPrompt(errorText)` + `setSidebarTab("ai")`.

---

### `sidebar/panels/OutlinePanel.tsx`

Esquema del documento activo extraído via regex.

Detecta: `\part`, `\chapter`, `\section`, `\subsection`, `\subsubsection`.

- Cada ítem muestra su indentación según nivel.
- Click → `setEditorJumpLine(línea)` para navegar en el editor.

---

### `sidebar/panels/AiChatPanel.tsx`

Chat con el asistente IA.

- Renderiza mensajes con `ReactMarkdown` (bloques de código, listas, párrafos).
- Botón "limpiar" → `setMessages([])`.
- `pendingAiPrompt` del store se auto-envía en `useEffect`.
- Banner de advertencia si no hay API key y el provider no es localhost.
- El área de texto acepta `Enter` para enviar y `Shift+Enter` para nueva línea.
- Streaming: `listen("ai-token")` → `updateLastAiChatMessage`; `listen("ai-done")` → `setIsTyping(false)`.

---

### `editor/LatexEditor.tsx`

Editor CodeMirror 6 con extensiones LaTeX.

**Extensiones activas:**
- `basicSetup` — numeración de líneas, resaltado de línea activa, etc.
- `StreamLanguage.define(stex)` — resaltado sintáctico LaTeX.
- `autocompletion({ override: [latexCompletions] })` — ~40 comandos LaTeX con snippets.
- `linter(latexLinter)` + `lintGutter()` — validación de pares `\begin`/`\end`.
- `EditorView.updateListener` — sincroniza el contenido con el store.

**Jump to line:** `useEffect` sobre `editorJumpLine`; cuando cambia, hace `dispatch` en la vista de CodeMirror y resetea el valor en el store.

**Vista de archivos no-tex:** si el archivo activo es `.pdf` lo muestra en `<iframe>`, si es imagen en `<img>` (usando `convertFileSrc` para el protocolo `asset://`).

---

### `editor/latexCompletions.ts`

Proveedor de autocompleción para CodeMirror. Define ~40 entradas con `label`, `type` y `apply` (snippet con `${cursor}`). Ejemplos: `\begin{}`, `\frac{}{}`, `\includegraphics[]{}`...

---

### `editor/latexLinter.ts`

Linter de CodeMirror basado en stack. Parsea el documento línea a línea buscando `\begin{env}` y `\end{env}`. Produce `Diagnostic[]` para:
- Entornos cerrados sin abrir.
- Entornos abiertos sin cerrar (al final del documento).

---

### `pdf/PdfViewer.tsx`

Visualizador PDF basado en pdf.js.

**Flujo de carga:**
1. Detecta cambio en `pdfPath` (incluye timestamp).
2. Extrae el path limpio (sin `?t=…`).
3. `readFileBytes(cleanPath)` → `number[]` → `Uint8Array`.
4. `pdfjsLib.getDocument({ data })` → incrementa `docVersion`.
5. `useEffect([currentPage, scale, docVersion])` → renderiza en `<canvas>`.

**Controles:** página anterior/siguiente, zoom +/−, indicador de página actual.

---

### `settings/SettingsModal.tsx`

Modal de configuración con navegación tipo drill-down.

**Vistas:**
- **Principal** — menú de navegación a sub-vistas.
- **LaTeX** — estado de Tectonic (instalado, versión, caché), botón "Precalentar caché".
- **IA** — presets de proveedor (OpenAI, Gemini, LM Studio, Ollama), selector de modelo con carga dinámica, campo de API key.
- **App** — placeholder para ajustes futuros.

Se cierra al hacer click fuera o presionar Escape (hook `useClickOutside`).

---

### `ui/TectonicBanner.tsx`

Banner fijo en la parte superior cuando Tectonic no está instalado. Muestra las instrucciones de instalación recibidas por el evento `tectonic-missing`.

### `ui/ResizeHandle.tsx`

Wrapper delgado sobre el `<PanelResizeHandle>` de `react-resizable-panels` con estilo visual consistente.

### `ui/StatusBar.tsx`

Barra inferior con información de estado (archivo activo, estado de compilación, línea/columna).

---

## Hooks

### `hooks/useCompile.ts`

```typescript
useCompile(): { compile: () => Promise<void> }
```

Encapsula el flujo completo de compilación:
1. Guarda el archivo activo si está sucio.
2. Llama a `compileLatex(rootFilePath ?? activeFilePath)`.
3. En éxito: actualiza `pdfPath` con timestamp.
4. En error: cambia `sidebarTab` a `"logs"`.

### `hooks/useClickOutside.ts`

```typescript
useClickOutside<T extends HTMLElement>(handler: () => void): RefObject<T>
```

Retorna un ref. Cuando el usuario hace click/touch fuera del elemento referenciado o presiona Escape, llama a `handler`. Usado por `ContextMenu` y `SettingsModal`.
