use serde::{Deserialize, Serialize};
use tauri::{Emitter, WebviewWindow};

#[derive(Debug, Serialize, Deserialize)]
pub struct AiConfig {
    pub api_key: String,
    pub provider_url: String,
    pub model: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiRequest {
    pub config: AiConfig,
    pub preamble: String,
    pub selection: String,
    pub context: String,
}

const SYSTEM_PROMPT: &str = r#"Eres un experto en LaTeX.
Devuelve únicamente código LaTeX válido.
NO expliques nada.
Mantén consistencia con \begin y \end.
Respeta el preámbulo existente."#;

#[tauri::command]
pub async fn stream_ai_assist(
    window: WebviewWindow,
    request: AiRequest,
) -> Result<(), String> {
    use futures_util::StreamExt;
    use reqwest::Client;

    let body = serde_json::json!({
        "model": request.config.model,
        "stream": true,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": build_user_prompt(&request)}
        ]
    });

    let client = Client::new();
    let endpoint = format!(
        "{}/chat/completions",
        request.config.provider_url.trim_end_matches('/')
    );

    let response = client
        .post(&endpoint)
        .bearer_auth(&request.config.api_key)
        .json(&body)
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

fn build_user_prompt(req: &AiRequest) -> String {
    format!(
        "## Preámbulo\n```latex\n{}\n```\n\n## Contexto\n```latex\n{}\n```\n\n## Selección\n```latex\n{}\n```\n\nMejora o completa la selección manteniendo coherencia con el preámbulo.",
        req.preamble, req.context, req.selection
    )
}
