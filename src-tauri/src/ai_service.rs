use serde::{Deserialize, Serialize};
use tauri::{Emitter, WebviewWindow};

#[derive(Debug, Serialize, Deserialize)]
pub struct AiConfig {
    pub api_key: String,
    pub provider_url: String,
    pub model: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiRequest {
    pub config: AiConfig,
    pub document_context: String,
    pub messages: Vec<ChatMessage>,
}

const SYSTEM_PROMPT: &str = r#"Eres un asistente experto en LaTeX.
Ayuda al usuario a crear, corregir y entender su documento.
Si proporcionas código, usa bloques Markdown.
Devuelve respuestas concisas y directas."#;

#[tauri::command]
pub async fn stream_ai_assist(
    window: WebviewWindow,
    request: AiRequest,
) -> Result<(), String> {
    use futures_util::StreamExt;
    use reqwest::Client;

    let mut payload_messages = vec![
        serde_json::json!({
            "role": "system",
            "content": format!("{}\n\nDOCUMENTO ACTIVO DEL USUARIO:\n```latex\n{}\n```", SYSTEM_PROMPT, request.document_context)
        })
    ];

    for msg in &request.messages {
        payload_messages.push(serde_json::json!({
            "role": msg.role,
            "content": msg.content
        }));
    }

    let body = serde_json::json!({
        "model": request.config.model,
        "stream": true,
        "messages": payload_messages
    });

    let client = Client::new();
    let endpoint = format!(
        "{}/chat/completions",
        request.config.provider_url.trim_end_matches('/')
    );

    let mut req = client.post(&endpoint).json(&body);

    if !request.config.api_key.trim().is_empty() {
        req = req.bearer_auth(request.config.api_key.trim());
    }

    let response = req
        .send()
        .await
        .map_err(|e| format!("Error de red: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("LLM error {}: {}", status, text));
    }

    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Error leyendo stream: {}", e))?;
        let text = String::from_utf8_lossy(&chunk);

        for line in text.lines() {
            if let Some(data) = line.strip_prefix("data: ") {
                if data.trim() == "[DONE]" {
                    window.emit("ai-done", ()).ok();
                    return Ok(());
                }
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                    if let Some(token) = json
                        .pointer("/choices/0/delta/content")
                        .and_then(|v| v.as_str())
                    {
                        window.emit("ai-token", token.to_string()).ok();
                    }
                }
            }
        }
    }

    window.emit("ai-done", ()).ok();
    Ok(())
}

#[derive(Deserialize)]
struct ModelsResponse {
    data: Vec<ModelData>,
}

#[derive(Deserialize)]
struct ModelData {
    id: String,
}

#[tauri::command]
pub async fn fetch_available_models(provider_url: String, api_key: String) -> Result<Vec<String>, String> {
    use reqwest::Client;

    let endpoint = format!("{}/models", provider_url.trim_end_matches('/'));
    
    let client = Client::new();
    let mut req = client.get(&endpoint);

    if !api_key.trim().is_empty() {
        req = req.bearer_auth(api_key.trim());
    }

    let response = req.send().await.map_err(|e| format!("Error de red: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("Error {}: {}", status, text));
    }

    let models_resp: ModelsResponse = response
        .json()
        .await
        .map_err(|e| format!("Error parseando JSON: {}", e))?;

    let mut model_names: Vec<String> = models_resp.data.into_iter().map(|m| m.id).collect();
    model_names.sort();
    
    Ok(model_names)
}
