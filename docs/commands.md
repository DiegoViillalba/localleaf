# Referencia de comandos Tauri

Todos los comandos se invocan desde el frontend con `invoke(name, payload)` (ver `src/lib/tauri.ts`). Los comandos síncronos Rust se ejecutan en el hilo de Tokio gestionado por Tauri. Los errores se devuelven como `Err(String)` en Rust → `Promise<T>` rechazada en TypeScript.

---

## Compilación — `compiler.rs`

### `compile_latex`

Compila un archivo `.tex` con Tectonic y devuelve el resultado.

```typescript
compileLatex(texPath: string): Promise<CompileResult>

interface CompileResult {
  success: boolean;
  pdf_path?: string;      // ruta absoluta al PDF generado
  errors: CompileError[]; // vacío si success = true
  raw_log: string;        // stdout + stderr completos de Tectonic
}

interface CompileError {
  line?: number;   // número de línea si se pudo extraer
  message: string;
  kind: "error" | "warning" | "info";
}
```

**Comportamiento:**
- Si Tectonic no está instalado devuelve `success: false` con mensaje de instalación, sin lanzar excepción.
- Si la compilación falla y no se pueden parsear errores estructurados, devuelve las últimas 20 líneas del log como fallback.
- Invoca Tectonic con `--outdir <dir_del_tex> --keep-logs` y `.current_dir(<dir_del_tex>)` para resolver `\input`/`\include`.

---

### `check_tectonic`

```typescript
checkTectonic(): Promise<boolean>
```

Devuelve `true` si Tectonic (sidecar o sistema) está disponible y responde a `--version`.

---

### `get_tectonic_status`

```typescript
getTectonicStatus(): Promise<TectonicStatus>

interface TectonicStatus {
  installed: boolean;
  version?: string;       // e.g. "0.15.0"
  cache_dir?: string;     // ruta al caché de Tectonic
  bundle_cached: boolean; // true si existe urls/ o manifests/ en el caché
}
```

Usado por `SettingsModal` para mostrar el estado de LaTeX.

---

### `warm_cache`

```typescript
warmCache(): Promise<void>
```

Compila un documento LaTeX mínimo (`\documentclass{article}\begin{document}warm\end{document}`) para forzar la descarga del bundle de Tectonic al directorio de caché. Lanza `Err` si Tectonic no está instalado.

---

## Sistema de archivos — `fs_service.rs`

### `read_file`

```typescript
readFile(path: string): Promise<string>
```

Lee un archivo de texto. Falla con mensaje descriptivo si el path no existe.

---

### `read_file_bytes`

```typescript
readFileBytes(path: string): Promise<number[]>
```

Lee un archivo binario. Devuelve `number[]` (Uint8Array compatible). Usado por `PdfViewer` para cargar PDFs sin depender del protocolo `asset://`.

---

### `save_file`

```typescript
saveFile(path: string, content: string): Promise<void>
```

Escribe `content` en `path`. Crea los directorios intermedios si no existen.

---

### `list_directory`

```typescript
listDirectory(dirPath: string): Promise<FileEntry[]>
```

Lista los hijos directos de un directorio (no recursivo). Excluye entradas ocultas (`.`). Ordena: carpetas primero, luego alfabético.

```typescript
interface FileEntry {
  name: string;
  path: string;        // ruta absoluta
  is_dir: boolean;
  extension?: string;  // sin punto, e.g. "tex"
  children?: FileEntry[]; // solo presente en scan_project
}
```

---

### `scan_project`

```typescript
scanProject(dirPath: string): Promise<FileEntry>
```

Devuelve el árbol completo del proyecto de forma recursiva. La raíz es el propio `dirPath`.

**Exclusiones automáticas:** entradas ocultas (`.`), `target/`, `node_modules/`, `_minted*`, `__pycache__`.

**Límite de profundidad:** 10 niveles (protección contra symlinks cíclicos).

---

### `create_file`

```typescript
createFile(dirPath: string, name: string): Promise<string>
```

Crea un archivo vacío en `dirPath/name`. Devuelve la ruta absoluta del archivo creado. Falla si ya existe.

---

### `create_folder`

```typescript
createFolder(dirPath: string, name: string): Promise<string>
```

Crea una carpeta (y subdirectorios intermedios si necesario). Devuelve la ruta absoluta. Falla si ya existe.

---

### `rename_entry`

```typescript
renameEntry(oldPath: string, newName: string): Promise<string>
```

Renombra un archivo o carpeta. Solo cambia el nombre, no mueve entre directorios. Devuelve la nueva ruta absoluta. Falla si el destino ya existe.

---

### `delete_entry`

```typescript
deleteEntry(path: string): Promise<void>
```

Elimina un archivo o carpeta (recursiva). No va a la papelera — la operación es irreversible.

---

### `open_folder_dialog`

```typescript
openFolderDialog(): Promise<string | null>
```

Abre el diálogo nativo de selección de carpeta. Devuelve la ruta seleccionada o `null` si el usuario cancela.

---

### `create_project`

```typescript
createProject(workspaceDir: string, projectName: string): Promise<string>
```

Crea `workspaceDir/projectName/` y escribe dentro un `main.tex` con la plantilla LaTeX por defecto. Devuelve la ruta absoluta de `main.tex`. Valida que el nombre no contenga caracteres inválidos en el sistema de archivos.

---

### `import_files`

```typescript
importFiles(sourcePaths: string[], destDir: string): Promise<void>
```

Copia archivos individuales (no carpetas) desde `sourcePaths` al directorio `destDir`. Las rutas de origen inexistentes se ignoran silenciosamente. Usado por el drag & drop del `FileTreePanel`.

---

## Inteligencia Artificial — `ai_service.rs`

### `stream_ai_assist`

```typescript
streamAiAssist(request: AiRequest): Promise<void>

interface AiRequest {
  config: AiConfig;
  document_context: string; // contenido actual del editor
  messages: ChatMessage[];  // historial completo de la conversación
}

interface AiConfig {
  api_key: string;      // vacío para proveedores locales
  provider_url: string; // e.g. "https://api.openai.com/v1"
  model: string;        // e.g. "gpt-4o"
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}
```

**Comportamiento:**
- Construye el sistema de mensajes con un system prompt fijo + el documento activo inyectado como bloque de código LaTeX.
- Hace `POST {provider_url}/chat/completions` con `stream: true`.
- Parsea SSE línea a línea; emite el evento Tauri `ai-token` con cada fragmento y `ai-done` al terminar.
- Añade `Authorization: Bearer {api_key}` solo si la clave no está vacía (compatibilidad con LM Studio / Ollama).

**Eventos emitidos:**

| Evento | Payload | Cuándo |
|---|---|---|
| `ai-token` | `string` | Cada fragmento de texto del LLM |
| `ai-done` | `null` | Al recibir `[DONE]` o finalizar el stream |

---

### `fetch_available_models`

```typescript
fetchAvailableModels(providerUrl: string, apiKey: string): Promise<string[]>
```

Hace `GET {provider_url}/models` y devuelve los IDs de modelos disponibles, ordenados alfabéticamente. Usado en `SettingsModal` para el selector de modelo.
