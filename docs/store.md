# Estado global — Zustand (`useAppStore`)

**Archivo:** `frontend/src/store/useAppStore.ts`

El store central de la aplicación. Usa `create` de Zustand con el middleware `persist` para sobrevivir entre sesiones de forma selectiva.

---

## Persistencia

Solo se persisten en `localStorage` (clave `"localleaf-storage"`) las siguientes secciones:

| Sección | Qué guarda |
|---|---|
| `layout` | Anchos de paneles, flags collapsed |
| `aiConfig` | URL del proveedor, API key, modelo seleccionado |
| `settings` | Estado de Tectonic (instalado, versión, caché) |

El resto del estado (archivo activo, contenido, árbol del proyecto, historial de chat, estado de compilación) se descarta al cerrar la app — evita datos obsoletos entre sesiones.

---

## Estado

### Workspace

```typescript
workspaceDir: string | null
// Ruta absoluta de la carpeta abierta. null = sin proyecto.

projectTree: FileEntry | null
// Árbol recursivo devuelto por scan_project. null = sin proyecto.
```

### Archivos abiertos

```typescript
openFiles: string[]
// Lista de rutas abiertas (base para futura pestaña múltiple).

activeFilePath: string | null
// Archivo actualmente visible en el editor.

content: string
// Contenido actual del editor (puede tener cambios sin guardar).

originalContent: string
// Último contenido confirmado en disco. Usado para calcular isDirty.

isDirty: boolean
// true si content !== originalContent.
```

### Compilación

```typescript
rootFilePath: string | null
// Archivo que Tectonic compilará. Puede diferir de activeFilePath
// (e.g. main.tex mientras se edita chapters/intro.tex).
// Auto-detectado al abrir: prioriza "main.tex" o único .tex.

compileStatus: "idle" | "compiling" | "success" | "error"

compileResult: CompileResult | null
// Último resultado completo de compile_latex.

pdfPath: string | null
// Ruta al PDF + timestamp: "…/main.pdf?t=1714000000000"
// El timestamp fuerza la recarga en PdfViewer.
```

### Inteligencia Artificial

```typescript
aiStatus: "idle" | "streaming" | "error"

aiConfig: AiConfig  // PERSISTIDO
// { api_key, provider_url, model }

aiChatMessages: ChatMessage[]
// Historial completo de la conversación en AiChatPanel.

pendingAiPrompt: string | null
// Prompt auto-generado por LogsPanel ("Solucionar con IA").
// AiChatPanel lo consume en useEffect y lo limpia a null.
```

### Configuración

```typescript
settings: {
  latex: {
    installed: boolean;
    version?: string;    // e.g. "0.15.0"
    cacheReady: boolean;
  }
}
// PERSISTIDO.
```

### UI

```typescript
sidebarTab: "files" | "search" | "logs" | "outline" | "ai"
// Cambia automáticamente a "logs" cuando la compilación falla.

editorJumpLine: number | null
// OutlinePanel lo establece; LatexEditor lo consume y resetea a null.

isSettingsOpen: boolean

layout: {
  sidebarWidth: number;   // % (default 20)
  editorWidth: number;    // % (default 40)
  pdfWidth: number;       // % (default 40)
  isSidebarCollapsed: boolean;
  isPdfCollapsed: boolean;
}
// PERSISTIDO.
```

---

## Acciones principales

### Workspace

| Acción | Firma | Descripción |
|---|---|---|
| `setWorkspace` | `(dir, tree, rootPath?)` | Establece directorio, árbol y raíz de una vez |
| `setProjectTree` | `(tree)` | Actualiza solo el árbol (tras refresh) |
| `setRootFilePath` | `(path \| null)` | Cambia el archivo raíz a compilar |

### Archivos

| Acción | Firma | Descripción |
|---|---|---|
| `openFile` | `(path, content)` | Abre archivo; actualiza activeFilePath, content, openFiles |
| `closeFile` | `(path)` | Cierra archivo; activa el anterior si era el activo |
| `setContent` | `(content)` | Actualiza contenido; recalcula isDirty automáticamente |
| `markClean` | `()` | Sincroniza originalContent con content tras guardar |

### IA

| Acción | Firma | Descripción |
|---|---|---|
| `appendAiChatMessage` | `(msg)` | Añade mensaje al historial |
| `updateLastAiChatMessage` | `(content)` | Acumula token en el último mensaje assistant |
| `setAiChatMessages` | `(messages)` | Reemplaza historial (usado al limpiar el chat) |
| `setPendingAiPrompt` | `(prompt \| null)` | Establece/limpia prompt auto-generado |

### UI

| Acción | Firma | Descripción |
|---|---|---|
| `setSidebarTab` | `(tab)` | Cambia panel activo del sidebar |
| `setEditorJumpLine` | `(line \| null)` | Solicita al editor saltar a línea |
| `setLayout` | `(Partial<layout>)` | Merge parcial del layout |
| `setLatexSettings` | `(Partial<latex>)` | Actualiza estado de Tectonic |

---

## Flujo típico de apertura de proyecto

```
1. openFolderDialog()           → ruta de carpeta
2. scanProject(dir)             → FileEntry árbol completo
3. setWorkspace(dir, tree)      → store actualizado
                                   rootFilePath auto-detectado
4. readFile(rootFilePath)       → contenido
5. openFile(rootFilePath, txt)  → editor listo
```
