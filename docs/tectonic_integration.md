# Integración de Tectonic (Sidecars)

El mayor desafío en la construcción de editores LaTeX es la dependencia hacia el entorno del usuario (requiriendo instalaciones de gigabytes como TeX Live). **LocalLeaf soluciona esto empaquetando [Tectonic](https://tectonic-typesetting.github.io/) nativamente como un Sidecar.**

## ¿Qué es un Sidecar de Tauri?
Un Sidecar es un binario ejecutable pre-compilado que Tauri adjunta (empaqueta) y distribuye junto con tu aplicación. Esto significa que cuando un usuario instala LocalLeaf, automáticamente obtiene el motor LaTeX interno sin descargas extra ni configuraciones del sistema (PATH).

## Archivos Necesarios
Los binarios de Tectonic deben residir en la carpeta `src-tauri/bin/` bajo nombres específicos que coincidan con la arquitectura de destino (el Target Triple de Rust):
- `tectonic-aarch64-apple-darwin` (Mac Apple Silicon)
- `tectonic-x86_64-apple-darwin` (Mac Intel)
- `tectonic-x86_64-pc-windows-msvc.exe` (Windows)

La configuración `tauri.conf.json` los detecta mediante esta directiva:
```json
"bundle": {
  "externalBin": ["bin/tectonic"]
}
```

## Comunicación con Tectonic (`ShellExt`)

El backend usa `tauri_plugin_shell` para invocar Tectonic. La función `tectonic_cmd()` implementa un patrón de **sidecar con fallback a PATH** que permite que el mismo código funcione tanto en producción (con binario empaquetado) como en desarrollo (con Tectonic instalado vía `brew` o `cargo install`):

```rust
use tauri_plugin_shell::ShellExt;

fn tectonic_cmd(app: &tauri::AppHandle) -> tauri_plugin_shell::process::Command {
    app.shell()
        .sidecar("tectonic")
        .unwrap_or_else(|_| app.shell().command("tectonic"))
}

pub async fn is_tectonic_available(app: &tauri::AppHandle) -> bool {
    tectonic_cmd(app)
        .arg("--version")
        .output()
        .await
        .map(|o| o.status.success())
        .unwrap_or(false)
}
```

- En **producción**: `sidecar("tectonic")` encuentra el binario empaquetado en `src-tauri/bin/`.
- En **desarrollo** (`cargo tauri dev`): el sidecar no existe, `unwrap_or_else` cae en `command("tectonic")` que busca en el PATH del sistema.

Esta función se usa de forma consistente en `compile_latex`, `check_tectonic`, `get_tectonic_status` y `warm_cache`.

### Soporte multi-archivo (`\input` / `\include`)

Para que Tectonic resuelva referencias relativas correctamente, la compilación se lanza desde el directorio del archivo raíz:

```rust
tectonic_cmd(&app)
    .arg("--outdir").arg(&output_dir)
    .arg("--keep-logs")
    .arg(&tex_path)
    .current_dir(&output_dir)   // <-- clave para \input{chapters/intro}
    .output()
    .await
```

## Gestión de Caché (`warm_cache`)
Tectonic es especial porque no trae todos los paquetes de LaTeX en el ejecutable, sino que los descarga "On Demand" (bajo demanda) de la nube. 
Para optimizar la experiencia, LocalLeaf provee un comando `warm_cache`.

Este comando genera una compilación fantasma e invisible sobre la marcha:
```latex
\documentclass{article}\begin{document}warm\end{document}
```
Esto fuerza a Tectonic a conectarse a internet, descargar su *bundle* principal, y depositarlo en la carpeta de caché del usuario (ej. `~/Library/Caches/Tectonic`), acelerando drásticamente todas las futuras compilaciones del usuario final.
