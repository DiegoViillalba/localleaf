# Sistema de Versionado (Git Sidecar) en LocalLeaf

LocalLeaf cuenta ahora con un sistema de control de versiones automatizado, integrado de forma transparente como un proceso secundario ("sidecar") basado en Git.

## Objetivo
Permitir a los usuarios tener un historial de versiones detallado, capacidades de colaboración mediante GitHub y control de conflictos, todo ello sin tener que escribir comandos de Git en la terminal ni interactuar directamente con flujos de trabajo técnicos. 

El versionado *no interfiere* con el guardado continuo (Auto-save). El guardado en disco es inmediato, mientras que los commits representan "fotografías" del progreso a lo largo del tiempo.

## Arquitectura

- **Git como Sidecar**: Tauri se encarga de empaquetar y gestionar el binario de `git`. El backend (`git_service.rs`) se comunica con este binario a través de `tauri_plugin_shell::ShellExt`.
- **Inicialización Oculta**: El sistema inicializa un repositorio `.git` estándar en la raíz del proyecto. Sin embargo, nuestro sistema de archivos virtual y el explorador de archivos ignoran las carpetas que comienzan con un punto, ocultándolo de la UI del usuario.
- **Frontend Reactivo**: Los componentes del frontend solicitan estados de Git (ej. `git_log`, `git_status`) a demanda y muestran una línea de tiempo (Timeline) en el panel lateral.
- **Diferencias Visuales (Diffs)**: Usando `@codemirror/merge`, LocalLeaf presenta de manera nativa dentro del editor principal las diferencias de código cuando se necesita comparar o resolver un conflicto.

## Componentes Principales

1. **Auto-commit Hook (`useAutoCommit.ts`)**:
   Un "watcher" silencioso que mide el tiempo de inactividad del usuario (sin presionar teclas). Si se alcanza el umbral (2, 5 o 10 minutos, configurable en *Settings*), se lanza una orden al backend para hacer un *stage* completo y generar un commit automático. Git aborta el commit si no detecta diferencias reales (`git diff --quiet`).

2. **Backend de Rust (`git_service.rs`)**:
   Envoltorio ligero para subcomandos críticos: `init`, `status`, `commit`, `log`, `diff`, `pull`, `push` y `checkout`. 
   Maneja dinámicamente credenciales (PAT) inyectándolas en las URL HTTPS de los "remotes" en tiempo de ejecución de manera efímera para que no queden rastros expuestos en `config` estáticos.

3. **Panel Lateral de Versiones (`VersionSidecar.tsx`)**:
   - Muestra el historial descendente de los *commits*.
   - Permite **Sincronizar (Sync)** (pull luego push) si hay un URL remoto configurado.
   - Detecta si hay conflictos (`Unmerged paths` en `git status`). Si los hay, renderiza un menú especial de resolución permitiendo elegir la versión *Local* ("ours") o la *Remota* ("theirs").
   - Otorga botones directos para "Ver diferencias" y "Restaurar" versiones anteriores.

## Flujo de Resolución de Conflictos
En vez de exponer las ramas en terminal o las etiquetas difusas, un conflicto en LocalLeaf se extrae e identifica mostrando explícitamente los archivos dañados en la pestaña "Historial de Versiones". 
El usuario solo debe elegir un botón: usar su propia versión o sobreescribir con lo que bajó de la nube. Al elegir, la UI manda una instrucción `git checkout --ours` o `--theirs`, añade el archivo y lo commitea, curando el estado del repositorio.

## Seguridad
- El **Token de Acceso (PAT)** no se imprime nunca en la terminal y solo reside en el *localStorage* de LocalLeaf (o persistencia segura de estado) inyectándose como variable de autenticación Basic en HTTPS al volar.
- El panel de configuración pide el PAT como campo de tipo `password`.

---

*LocalLeaf ahora goza de historial infinito sin preocupar al usuario por comandos complejos.*
