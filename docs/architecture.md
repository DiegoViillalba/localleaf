# Arquitectura de LocalLeaf

LocalLeaf es un editor de LaTeX moderno y ligero, diseñado para funcionar nativamente en el escritorio (macOS, Windows, Linux) sin depender de instalaciones pesadas de TeX Live. Utiliza una arquitectura dividida entre un **Frontend (React)** y un **Backend (Rust + Tauri)**.

## Vista General del Stack

- **Frontend:** React, TypeScript, TailwindCSS, Zustand (Manejo de estado global), CodeMirror 6 (Editor de código).
- **Backend:** Rust, Tauri v2.
- **Motor LaTeX:** Tectonic (empaquetado como Sidecar).

---

## 1. Frontend (Capa de Presentación)

El frontend está estructurado para ofrecer un entorno de edición altamente responsivo y persistente.

### Manejo de Estado (`useAppStore.ts`)
Toda la lógica de estado global reside en Zustand. Esto previene el *prop-drilling* y centraliza la configuración de la app.
- **`layout`**: Guarda los anchos de los paneles (`react-resizable-panels`), permitiendo que el usuario pueda ocultar o ajustar libremente el tamaño del explorador de archivos, el editor y el visor PDF.
- **`content` y `originalContent`**: El núcleo del guardado automático. Para evitar corrupciones de archivos (como sobreescribir imágenes al previsualizarlas), el estado compara estrictamente `content !== originalContent` antes de marcar el estado como "sucio" (`isDirty`).
- **`settings`**: Mantiene las configuraciones persistentes (como los estados del caché de LaTeX y preferencias futuras) para alimentar los modales y barras de estado.

### Interfaz Híbrida (`App.tsx`)
La interfaz utiliza componentes colapsables y modales que flotan sobre el contenido principal:
- **Global Settings Modal:** Un panel central basado en un patrón *Maestro-Detalle* (Drill-down) que controla las opciones del entorno, y se sobrepone (`z-50`, `backdrop-blur`) al editor sin afectar el layout interno.
- **File Previews:** El editor es capaz de detectar si un archivo es de código `.tex` o un medio binario (`.pdf`, `.png`), e intercambiar dinámicamente entre CodeMirror y previsualizaciones HTML (`iframe`, `img`) permitidas mediante los protocolos seguros de Tauri (`asset://`).

---

## 2. Backend (Capa Nativa / Rust)

Tauri nos permite interactuar con el sistema operativo de manera eficiente. Todo el backend se encuentra en la carpeta `src-tauri`.

### Gestión del Sistema de Archivos (`fs_service.rs`)
La manipulación de archivos está estrictamente regulada. Exponemos comandos seguros a React para que pueda consultar árboles de directorios, abrir archivos y guardar cambios, pero manteniendo la restricción de que sólo se manipulan recursos dentro del "Workspace" activo.

### Motor de Compilación (`compiler.rs`)
Aquí es donde ocurre la magia técnica de LocalLeaf. En vez de requerir que el usuario configure variables de entorno, LocalLeaf utiliza **Tectonic como Sidecar**.
- **Ejecución Asíncrona:** Se aprovecha el motor asíncrono de Tauri v2 (`.output().await`) para compilar PDFs en segundo plano sin bloquear la interfaz de usuario.
- **Parsing de Errores:** Cuando la compilación falla, el backend intercepta el *stdout* completo de Tectonic, lo limpia y extrae los números de línea precisos para devolverlos estructurados al Frontend, iluminando las advertencias en la UI.
