# Sistema de Temas de Color (LocalLeaf)

## Visión General

LocalLeaf implementa un sistema dinámico de temas de color que permite a los usuarios alternar entre un modo Oscuro (Predeterminado), Claro y Personalizado.

Debido a que la interfaz de la aplicación fue originalmente construida utilizando clases utilitarias de Tailwind CSS basadas en la paleta `zinc` (ej. `bg-zinc-900`, `text-zinc-200`), se adoptó una estrategia de **Inversión de Escala (Scale Inversion)**. Esto permitió introducir temas globales sin necesidad de reescribir cientos de clases a lo largo de todo el código fuente.

## Estrategia de Implementación

### 1. Variables CSS y Sobrescritura de Tailwind (`tailwind.config.js` y `index.css`)
La paleta `zinc` en la configuración de Tailwind fue mapeada hacia variables CSS (`--theme-50` hasta `--theme-950`). 
En el archivo `index.css`, se definieron dos esquemas principales en la pseudo-clase `:root` y clases del `body`:

- **Tema Oscuro (`body.theme-dark`)**: Representa la escala nativa original de Tailwind `zinc`.
- **Tema Claro (`body.theme-light`)**: Invierte la escala cromática. La variable `--theme-950`, que originalmente era un color muy oscuro (usado para fondos), se redefine como `#ffffff` (blanco puro). De manera similar, `--theme-200` (usado para texto claro en fondos oscuros) se convierte en un gris oscuro `#27272a`. 

Al cambiar la clase del `body` a `theme-light`, Tailwind automáticamente comienza a leer la escala invertida, transformando toda la aplicación a un tema claro sin modificar una sola clase en React.

### 2. Generación Dinámica de Temas Personalizados (`lib/theme.ts`)
Para la opción de temas personalizados, el usuario puede seleccionar un "Color Base". El sistema utiliza la función `generatePalette` que:
1. Toma el color Hexadecimal base.
2. Interpola este color con blanco y negro basándose en los pesos de la escala Tailwind.
3. Inyecta dinámicamente un bloque `<style id="localleaf-custom-theme">` en el `<head>` del documento.
4. Asigna esta nueva paleta personalizada generada a las variables `--theme-*` bajo la clase de `body.theme-custom`.

### 3. Persistencia de Estado (`store/useAppStore.ts`)
Se actualizó el almacenamiento global de Zustand para retener las preferencias de tema del usuario:
- `appTheme`: Define el tema actualmente seleccionado (`dark`, `light`, `custom`).
- `customThemeColor`: Guarda el código Hexadecimal del color personalizado seleccionado.

### 4. Ciclo de Vida y UI (`App.tsx` y `SettingsModal.tsx`)
Un gancho (`useEffect`) ubicado en el punto de entrada de la aplicación (`App.tsx`) monitorea los cambios en la tienda y aplica automáticamente las clases correspondientes (`theme-dark`, `theme-light`, `theme-custom`) al elemento `document.body`, así como la inyección del estilo en línea si el tema personalizado está activo.

El usuario interactúa con este sistema a través del panel de configuración de LocalLeaf en la nueva pestaña de "Apariencia y Temas".
