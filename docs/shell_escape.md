# Flags avanzados de compilación LaTeX (`shell-escape`)

## Contexto

Algunos paquetes de LaTeX necesitan ejecutar programas externos durante la compilación. El más común es **`minted`**, que llama a `pygmentize` para resaltar código fuente con colores. Para que esto funcione, el motor LaTeX debe iniciarse con el flag `--shell-escape`.

Por defecto, Tectonic (el motor usado por LocalLeaf) **no permite** comandos externos, lo que es seguro para la mayoría de documentos. Este documento describe cómo LocalLeaf expone ese flag de forma controlada.

---

## Arquitectura

```
┌────────────────────┐     latexConfig.shellEscape     ┌─────────────────┐
│   Settings UI      │ ──────────────────────────────► │  Zustand Store  │
│  (SettingsModal)   │                                 │  (persistido)   │
└────────────────────┘                                 └────────┬────────┘
                                                                │
                                                       useCompile hook
                                                                │
                                                   compileLatex(path, shellEscape)
                                                                │
                                                    ┌───────────▼────────────┐
                                                    │   lib/tauri.ts         │
                                                    │  invoke("compile_latex")│
                                                    └───────────┬────────────┘
                                                                │
                                                    ┌───────────▼────────────┐
                                                    │  compiler.rs (Rust)    │
                                                    │  --shell-escape flag   │
                                                    └───────────┬────────────┘
                                                                │
                                               CompileResult { needs_shell_escape }
                                                                │
                                                    ┌───────────▼────────────┐
                                                    │  LogsPanel             │
                                                    │  Smart hint banner     │
                                                    └────────────────────────┘
```

---

## Configuración en la UI

**Ajustes → LaTeX → Compilación**

| Opción | Descripción |
|--------|-------------|
| 🔒 Modo Seguro | `--shell-escape` desactivado (por defecto) |
| ⚡ Modo Avanzado | Activa el toggle de shell-escape |
| Toggle de comandos externos | Habilita/deshabilita `--shell-escape` individualmente |

Cuando el toggle está activo, se muestra un banner de advertencia ⚠ explicando el riesgo de seguridad.

---

## Estado global

```ts
// store/useAppStore.ts
latexConfig: {
  shellEscape: boolean;   // default: false
}
```

El valor se persiste en `localStorage` bajo la clave `localleaf-storage`, por lo que sobrevive reinicios de la app.

---

## Backend (Rust)

### `compiler.rs`

```rust
#[tauri::command]
pub async fn compile_latex(
    app: tauri::AppHandle,
    tex_path: String,
    shell_escape: bool,        // nuevo parámetro
) -> Result<CompileResult, String>
```

Cuando `shell_escape == true`, Tectonic se invoca con el flag adicional:

```rust
if shell_escape {
    cmd = cmd.arg("--shell-escape");
}
```

### `CompileResult`

```rust
pub struct CompileResult {
    pub success: bool,
    pub pdf_path: Option<String>,
    pub errors: Vec<serde_json::Value>,
    pub raw_log: String,
    pub needs_shell_escape: bool,   // nuevo campo
}
```

### `error_parser.rs`

La función `detect_shell_escape_needed(raw: &str) -> bool` analiza el log de compilación buscando:

| Patrón | Descripción |
|--------|-------------|
| `shell-escape` | Mención directa del flag |
| `shell escape` | Variante con espacio |
| `Package minted error` | Error oficial del paquete minted |
| `minted requires` | Mensaje de dependencia |
| `minted` + `error` | Combinación heurística |
| `you must invoke latex with the -shell-escape flag` | Mensaje explícito |
| `restricted \write18 enabled` | Modo parcial detectado |

---

## Detección inteligente de errores

Si una compilación falla y el log contiene alguno de los patrones anteriores, `CompileResult.needs_shell_escape` será `true`.

El panel de logs (`LogsPanel`) mostrará automáticamente un banner de sugerencia:

```
💡 Este documento requiere comandos externos
   Activa "Permitir comandos externos" en Ajustes → LaTeX → Compilación.
   [Ir a Ajustes →]
```

El botón abre directamente el modal de configuración.

---

## Seguridad

> ⚠ **El flag `--shell-escape` permite que LaTeX ejecute cualquier comando del sistema operativo.** Esto es necesario para algunos paquetes (`minted`, `gnuplot`, `svg`, etc.) pero abre la puerta a la ejecución de código arbitrario si el usuario compila un documento de una fuente no confiable.

**Mitigaciones implementadas:**

1. **Desactivado por defecto** — el usuario debe activarlo explícitamente.
2. **Banner de advertencia** — visible mientras el toggle está activo.
3. **Modo Seguro / Avanzado** — selector visual que comunica el nivel de riesgo.
4. **Detección reactiva** — solo se sugiere activarlo cuando el log lo indica, no de forma proactiva.

---

## Paquetes compatibles conocidos

| Paquete | Propósito |
|---------|-----------|
| `minted` | Resaltado de sintaxis de código |
| `gnuplot` | Generación de gráficas |
| `svg` | Inclusión y conversión de SVG |
| `epstopdf` (auto) | Conversión de EPS a PDF |
| `pythontex` | Ejecución de Python dentro de LaTeX |

---

## Referencias

- [Tectonic CLI — `--shell-escape`](https://tectonic-typesetting.github.io/book/latest/ref/tectonic-cli.html)
- [minted package documentation](https://ctan.org/pkg/minted)
- [TeX FAQ — shell-escape](https://texfaq.org/FAQ-shell-escape)
