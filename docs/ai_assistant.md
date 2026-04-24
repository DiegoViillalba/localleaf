# Asistente IA (Chat) en LocalLeaf

LocalLeaf cuenta con un asistente de Inteligencia Artificial integrado directamente en la barra lateral. Este asistente tiene conocimiento contextual del documento en el que estás trabajando actualmente, lo que le permite responder a tus dudas y corregir código LaTeX con un nivel de precisión mucho mayor.

## 1. Configuración (API Keys)

A diferencia de editores basados en la nube, LocalLeaf procesa el contexto localmente y se conecta de forma directa a la API de tu proveedor de IA preferido, lo que asegura tu privacidad.

### Opciones de Proveedor
Puedes utilizar tu propia API Key. LocalLeaf soporta oficialmente:

- **OpenAI (GPT-4o, GPT-4, GPT-3.5):** 
  - Provider URL: `https://api.openai.com/v1`
- **Google Gemini (1.5 Pro, 1.5 Flash):**
  - Provider URL: `https://generativelanguage.googleapis.com/v1beta/openai`
  - *(Nota: Gemini ofrece un endpoint compatible con OpenAI, por lo que LocalLeaf lo aprovecha de manera nativa sin necesitar configuraciones adicionales extrañas).*
- **LM Studio Local / Ollama Local:**
  - Si prefieres que tu información jamás salga de tu computadora, puedes conectar asistentes locales sin censura.
  - Provider URL LM Studio: `http://localhost:1234/v1`
  - Provider URL Ollama: `http://localhost:11434/v1` (usando un modelo local como `llama3` o `qwen2`).
  - La API Key es opcional y no requerida para servidores locales.

### Detección Automática de Modelos
En los ajustes de IA, existe un botón para **Cargar modelos de la API**. Esto realiza una llamada dinámica (`GET /models`) a tu proveedor, de forma que puedas seleccionar fácilmente con un menú desplegable cuál modelo de lenguaje utilizar (por ejemplo, ver qué modelos tienes instalados en tu entorno local sin tener que escribirlos manualmente).

## 2. Inyección de Contexto del Documento

Para que la IA entienda de qué estás hablando, no es necesario copiar y pegar manualmente tu código. LocalLeaf inyecta de forma silenciosa el contenido actual del editor en el **System Prompt**.

El pipeline en el backend (Rust - `ai_service.rs`) funciona así:

1. Lee el contenido que tienes abierto en el editor (`document_context`).
2. Lo pre-adjunta como un bloque de código markdown dentro del System Prompt.
3. Lo envía junto a todos tus mensajes previos en un arreglo tipo `"messages"`.

```rust
// Ejemplo de la inyección
let mut payload_messages = vec![
    serde_json::json!({
        "role": "system",
        "content": format!("{}\n\nDOCUMENTO ACTIVO DEL USUARIO:\n```latex\n{}\n```", SYSTEM_PROMPT, request.document_context)
    })
];
```

## 3. La Interfaz del Chat

Se ha diseñado un panel flotante (`AiChatPanel.tsx`) que reside en el Sidebar.

- **Historial Interactivo y Persistente:** Renderiza Markdown nativamente ajustado al estilo visual de LocalLeaf (fuentes sin serifa y bloques de código `mono` diferenciados). Tu conversación no se borra al cambiar de paneles.
- **Streaming In-Memory:** Utiliza Server-Sent Events (SSE) y el sistema de mensajería (IPC) de Tauri (`listen` y `emit`) para imprimir la respuesta letra por letra (`ai-token`) conforme es generada por el LLM.
- **Resolución Activa de Errores:** Cuando el motor de compilación detecta un fallo, la aplicación cambia al panel de *Logs* mostrando un botón de "Solucionar con IA". Esto genera un "auto-prompt" con tu error exacto de compilación, inyecta la solución en el chat y lo resuelve sin que escribas nada manualmente.

## 4. Tecnologías Involucradas

- **React / TailwindCSS:** UI y animaciones del chat.
- **Zustand:** Almacenamiento seguro de la API Key.
- **Reqwest:** Cliente HTTP asíncrono en Rust para interactuar con la API Restful de LLMs de forma súper rápida y no-bloqueante.
- **Tauri IPC Streams:** Puente de eventos en tiempo real entre el Hilo principal (Rust) y el Hilo de la Webview (React) para el streaming rápido de la red.
