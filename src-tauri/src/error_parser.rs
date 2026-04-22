/// Transforms raw Tectonic/LaTeX log output into clean, user-readable errors.
pub struct ParsedError {
    pub line: Option<u32>,
    pub message: String,
    pub kind: ErrorKind,
}

pub enum ErrorKind {
    Error,
    Warning,
    Info,
}

pub fn parse_latex_log(raw: &str) -> Vec<ParsedError> {
    let mut errors = Vec::new();

    for line in raw.lines() {
        let trimmed = line.trim();

        // Skip empty lines and verbose Tectonic internals
        if trimmed.is_empty()
            || trimmed.starts_with("note:")
            || trimmed.starts_with("Running")
            || trimmed.starts_with("Downloading")
        {
            continue;
        }

        if let Some(msg) = extract_error(trimmed) {
            errors.push(msg);
        }
    }

    // Deduplicate consecutive identical messages
    errors.dedup_by(|a, b| a.message == b.message);
    errors
}

fn extract_error(line: &str) -> Option<ParsedError> {
    // Pattern: "! Error message" — hard LaTeX errors
    if let Some(rest) = line.strip_prefix('!') {
        let message = rest.trim().to_string();
        if !message.is_empty() {
            return Some(ParsedError {
                line: None,
                message,
                kind: ErrorKind::Error,
            });
        }
    }

    // Pattern: "l.42 message" — line-number errors
    if line.starts_with("l.") {
        let parts: Vec<&str> = line[2..].splitn(2, ' ').collect();
        if parts.len() == 2 {
            if let Ok(line_num) = parts[0].parse::<u32>() {
                return Some(ParsedError {
                    line: Some(line_num),
                    message: parts[1].trim().to_string(),
                    kind: ErrorKind::Error,
                });
            }
        }
    }

    // Pattern: "error:" prefix (Tectonic)
    if let Some(rest) = line.to_lowercase().strip_prefix("error:") {
        return Some(ParsedError {
            line: None,
            message: rest.trim().to_string(),
            kind: ErrorKind::Error,
        });
    }

    // Pattern: "warning:" prefix
    if let Some(rest) = line.to_lowercase().strip_prefix("warning:") {
        return Some(ParsedError {
            line: None,
            message: rest.trim().to_string(),
            kind: ErrorKind::Warning,
        });
    }

    None
}

pub fn format_errors_for_ui(errors: &[ParsedError]) -> Vec<serde_json::Value> {
    use serde_json::json;
    errors
        .iter()
        .map(|e| {
            json!({
                "line": e.line,
                "message": e.message,
                "kind": match e.kind {
                    ErrorKind::Error => "error",
                    ErrorKind::Warning => "warning",
                    ErrorKind::Info => "info",
                }
            })
        })
        .collect()
}
