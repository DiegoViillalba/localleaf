/// Fetches BibTeX entries from DOI, arXiv, and ISBN sources.
/// All requests are made from Rust to avoid CORS issues in the WebView.

use reqwest::Client;
use serde_json::Value;

// ─── DOI ──────────────────────────────────────────────────────────────────────

/// Fetches BibTeX for a DOI identifier.
/// Sends `Accept: application/x-bibtex` to doi.org, which returns BibTeX directly.
#[tauri::command]
pub async fn fetch_bibtex_from_doi(doi: String) -> Result<String, String> {
    let doi = doi.trim().to_string();
    let doi = doi
        .trim_start_matches("https://doi.org/")
        .trim_start_matches("http://doi.org/")
        .trim_start_matches("doi:");

    let url = format!("https://doi.org/{}", doi);
    let client = Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| format!("Error creando cliente HTTP: {}", e))?;

    let response = client
        .get(&url)
        .header("Accept", "application/x-bibtex")
        .send()
        .await
        .map_err(|e| format!("Error de red al consultar DOI: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "DOI no encontrado (HTTP {}). Verifica que el DOI sea correcto.",
            response.status()
        ));
    }

    let text = response
        .text()
        .await
        .map_err(|e| format!("Error leyendo respuesta: {}", e))?;

    if !text.contains('@') {
        return Err("El servidor no devolvió BibTeX válido para este DOI.".to_string());
    }

    Ok(text)
}

// ─── arXiv ────────────────────────────────────────────────────────────────────

/// Fetches BibTeX for an arXiv identifier (e.g. "2301.07041" or "cs/0301001").
/// Uses the arXiv export API to get metadata and builds the BibTeX entry.
#[tauri::command]
pub async fn fetch_bibtex_from_arxiv(arxiv_id: String) -> Result<String, String> {
    let id = arxiv_id
        .trim()
        .trim_start_matches("https://arxiv.org/abs/")
        .trim_start_matches("http://arxiv.org/abs/")
        .trim_start_matches("arxiv:")
        .to_string();

    let _url = format!("https://export.arxiv.org/abs/{}", id);
    let client = Client::new();

    // Try the direct BibTeX export endpoint first
    let bibtex_url = format!("https://arxiv.org/bibtex/{}", id);
    if let Ok(resp) = client.get(&bibtex_url).send().await {
        if resp.status().is_success() {
            if let Ok(text) = resp.text().await {
                if text.contains('@') {
                    return Ok(text);
                }
            }
        }
    }

    // Fallback: fetch the Atom API and build BibTeX manually
    let atom_url = format!("https://export.arxiv.org/api/query?id_list={}", id);
    let response = client
        .get(&atom_url)
        .send()
        .await
        .map_err(|e| format!("Error de red al consultar arXiv: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "arXiv no encontrado (HTTP {}). Verifica el ID.",
            response.status()
        ));
    }

    let xml = response
        .text()
        .await
        .map_err(|e| format!("Error leyendo respuesta arXiv: {}", e))?;

    // Simple XML extraction (avoids pulling an XML parser dependency)
    let title = extract_xml_tag(&xml, "title")
        .unwrap_or_default()
        .replace('\n', " ")
        .trim()
        .to_string();

    if title.is_empty() || title == "ArXiv Query" {
        return Err(format!("arXiv ID '{}' no encontrado.", id));
    }

    let summary = extract_xml_tag(&xml, "summary")
        .unwrap_or_default()
        .replace('\n', " ")
        .trim()
        .to_string();

    // Extract all author names
    let authors: Vec<String> = xml
        .split("<author>")
        .skip(1)
        .filter_map(|chunk| extract_xml_tag(chunk, "name"))
        .map(|name| name_to_bibtex_author(&name))
        .collect();

    let author_str = authors.join(" and ");

    // Extract year from <published>
    let year = extract_xml_tag(&xml, "published")
        .and_then(|s| s.get(..4).map(|y| y.to_string()))
        .unwrap_or_else(|| "????".to_string());

    // Build a citation key: LastName + Year
    let first_last = authors
        .first()
        .and_then(|a| a.split(',').next())
        .map(|s| s.trim().to_lowercase().replace(|c: char| !c.is_ascii_alphanumeric(), ""))
        .unwrap_or_else(|| "arxiv".to_string());

    let key = format!("{}{}", first_last, year);

    let bibtex = format!(
        "@misc{{{key},\n  author        = {{{author_str}}},\n  title         = {{{title}}},\n  year          = {{{year}}},\n  eprint        = {{{id}}},\n  archiveprefix = {{arXiv}},\n  primaryclass  = {{see abstract}},\n  note          = {{{summary}}},\n  url           = {{https://arxiv.org/abs/{id}}}\n}}",
    );

    Ok(bibtex)
}

fn extract_xml_tag(xml: &str, tag: &str) -> Option<String> {
    let open = format!("<{}>", tag);
    let close = format!("</{}>", tag);
    let start = xml.find(&open)? + open.len();
    let end = xml[start..].find(&close)?;
    Some(xml[start..start + end].trim().to_string())
}

fn name_to_bibtex_author(name: &str) -> String {
    // "First Last" → "Last, First"
    let parts: Vec<&str> = name.trim().split_whitespace().collect();
    if parts.len() < 2 {
        return name.trim().to_string();
    }
    let last = parts.last().unwrap();
    let first = parts[..parts.len() - 1].join(" ");
    format!("{}, {}", last, first)
}

// ─── ISBN ─────────────────────────────────────────────────────────────────────

/// Fetches book metadata from Open Library by ISBN and formats it as BibTeX @book.
#[tauri::command]
pub async fn fetch_bibtex_from_isbn(isbn: String) -> Result<String, String> {
    let isbn = isbn
        .trim()
        .replace(['-', ' '], "")
        .trim_start_matches("isbn:")
        .to_string();

    if isbn.len() != 10 && isbn.len() != 13 {
        return Err(format!(
            "ISBN inválido: '{}'. Debe tener 10 o 13 dígitos.",
            isbn
        ));
    }

    let url = format!(
        "https://openlibrary.org/api/books?bibkeys=ISBN:{}&format=json&jscmd=data",
        isbn
    );
    let client = Client::new();

    let response = client
        .get(&url)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("Error de red al consultar Open Library: {}", e))?;

    let json: Value = response
        .json()
        .await
        .map_err(|e| format!("Error parseando respuesta JSON: {}", e))?;

    let book_key = format!("ISBN:{}", isbn);
    let book = json
        .get(&book_key)
        .ok_or_else(|| format!("ISBN '{}' no encontrado en Open Library.", isbn))?;

    let title = book["title"].as_str().unwrap_or("").to_string();
    let year = book["publish_date"]
        .as_str()
        .and_then(|d| d.split_whitespace().find(|s| s.len() == 4 && s.parse::<u32>().is_ok()))
        .unwrap_or("")
        .to_string();

    let publishers: Vec<&str> = book["publishers"]
        .as_array()
        .map(|arr| arr.iter().filter_map(|v| v["name"].as_str()).collect())
        .unwrap_or_default();
    let publisher = publishers.first().copied().unwrap_or("").to_string();

    let authors: Vec<String> = book["authors"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v["name"].as_str())
                .map(|n| name_to_bibtex_author(n))
                .collect()
        })
        .unwrap_or_default();
    let author_str = if authors.is_empty() {
        String::new()
    } else {
        authors.join(" and ")
    };

    let first_last = authors
        .first()
        .and_then(|a| a.split(',').next())
        .map(|s| s.trim().to_lowercase().replace(|c: char| !c.is_ascii_alphanumeric(), ""))
        .unwrap_or_else(|| "book".to_string());

    let key = format!("{}{}", first_last, year);

    let mut fields = vec![
        format!("  author    = {{{}}}", author_str),
        format!("  title     = {{{}}}", title),
        format!("  publisher = {{{}}}", publisher),
        format!("  year      = {{{}}}", year),
        format!("  isbn      = {{{}}}", isbn),
    ];

    if let Some(url_val) = book["url"].as_str() {
        fields.push(format!("  url       = {{{}}}", url_val));
    }

    let bibtex = format!("@book{{{},\n{}\n}}", key, fields.join(",\n"));
    Ok(bibtex)
}
