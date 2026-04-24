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

## Comunicación Segura (`ShellExt`)
Por seguridad y consistencia, el backend en Rust **nunca usa comandos genéricos del sistema** (`std::process::Command::new("tectonic")`). En su lugar, usa el plugin oficial de Shell para inicializar el sidecar exacto que corresponde a la plataforma.

**Ejemplo de implementación:**
```rust
use tauri_plugin_shell::ShellExt;

pub async fn is_tectonic_available(app: &tauri::AppHandle) -> bool {
    if let Ok(sidecar_command) = app.shell().sidecar("tectonic") {
        sidecar_command
            .arg("--version")
            .output()
            .await
            .map(|o| o.status.success())
            .unwrap_or(false)
    } else {
        false
    }
}
```

## Gestión de Caché (`warm_cache`)
Tectonic es especial porque no trae todos los paquetes de LaTeX en el ejecutable, sino que los descarga "On Demand" (bajo demanda) de la nube. 
Para optimizar la experiencia, LocalLeaf provee un comando `warm_cache`.

Este comando genera una compilación fantasma e invisible sobre la marcha:
```latex
\documentclass{article}\begin{document}warm\end{document}
```
Esto fuerza a Tectonic a conectarse a internet, descargar su *bundle* principal, y depositarlo en la carpeta de caché del usuario (ej. `~/Library/Caches/Tectonic`), acelerando drásticamente todas las futuras compilaciones del usuario final.
