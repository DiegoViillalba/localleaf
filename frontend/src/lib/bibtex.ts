// ─── Types ────────────────────────────────────────────────────────────────────

export interface BibEntry {
  key: string;          // citation key, e.g. "einstein1905"
  type: string;         // lowercased: article, book, inproceedings, etc.
  fields: Record<string, string>; // field name → value (outer braces stripped)
}

export interface ParseResult {
  entries: BibEntry[];
  errors: string[];
}

export interface EntryTypeConfig {
  label: string;
  required: string[];
  optional: string[];
}

// ─── Entry type definitions ───────────────────────────────────────────────────

export const ENTRY_TYPES: Record<string, EntryTypeConfig> = {
  article: {
    label: "Artículo",
    required: ["author", "title", "journal", "year"],
    optional: ["volume", "number", "pages", "month", "doi", "url", "note"],
  },
  book: {
    label: "Libro",
    required: ["author", "title", "publisher", "year"],
    optional: ["editor", "volume", "series", "address", "edition", "month", "isbn", "url", "note"],
  },
  inproceedings: {
    label: "Conferencia",
    required: ["author", "title", "booktitle", "year"],
    optional: ["editor", "pages", "organization", "publisher", "address", "month", "doi", "url", "note"],
  },
  incollection: {
    label: "Capítulo de libro",
    required: ["author", "title", "booktitle", "publisher", "year"],
    optional: ["editor", "pages", "chapter", "address", "doi", "url", "note"],
  },
  phdthesis: {
    label: "Tesis doctoral",
    required: ["author", "title", "school", "year"],
    optional: ["address", "month", "type", "url", "note"],
  },
  mastersthesis: {
    label: "Tesis de maestría",
    required: ["author", "title", "school", "year"],
    optional: ["address", "month", "type", "url", "note"],
  },
  techreport: {
    label: "Reporte técnico",
    required: ["author", "title", "institution", "year"],
    optional: ["type", "number", "address", "month", "url", "note"],
  },
  misc: {
    label: "Miscelánea",
    required: [],
    optional: ["author", "title", "year", "howpublished", "url", "note"],
  },
  unpublished: {
    label: "No publicado",
    required: ["author", "title", "note"],
    optional: ["year", "month", "url"],
  },
  inbook: {
    label: "Sección de libro",
    required: ["author", "title", "chapter", "publisher", "year"],
    optional: ["editor", "pages", "volume", "series", "address", "edition", "doi", "note"],
  },
  manual: {
    label: "Manual",
    required: ["title"],
    optional: ["author", "organization", "address", "edition", "year", "month", "url", "note"],
  },
};

// ─── Parser ───────────────────────────────────────────────────────────────────

export function parseBibTeX(text: string): ParseResult {
  const entries: BibEntry[] = [];
  const errors: string[] = [];

  let i = 0;
  const n = text.length;

  while (i < n) {
    // Skip whitespace
    while (i < n && /\s/.test(text[i])) i++;
    if (i >= n) break;

    // Skip line comments
    if (text[i] === "%") {
      while (i < n && text[i] !== "\n") i++;
      continue;
    }

    if (text[i] !== "@") { i++; continue; }
    i++; // consume @

    // Read entry type
    let type = "";
    while (i < n && /\w/.test(text[i])) type += text[i++];
    type = type.toLowerCase();

    // Skip whitespace
    while (i < n && /\s/.test(text[i])) i++;

    // Expect opening brace or paren (some tools use parens)
    const openChar = text[i];
    const closeChar = openChar === "(" ? ")" : "}";
    if (i >= n || (openChar !== "{" && openChar !== "(")) {
      errors.push(`Expected { after @${type} at position ${i}`);
      continue;
    }
    i++; // consume opening brace

    // Skip non-entry types
    if (["preamble", "string", "comment"].includes(type)) {
      let depth = 1;
      while (i < n && depth > 0) {
        if (text[i] === "{" || text[i] === "(") depth++;
        else if (text[i] === "}" || text[i] === ")") depth--;
        i++;
      }
      continue;
    }

    // Read citation key
    while (i < n && /\s/.test(text[i])) i++;
    let key = "";
    while (i < n && text[i] !== "," && text[i] !== "}" && text[i] !== ")") {
      key += text[i++];
    }
    key = key.trim();

    if (i < n && text[i] === ",") i++; // consume comma

    // Parse fields
    const fields: Record<string, string> = {};

    while (i < n) {
      // Skip whitespace and commas
      while (i < n && (/\s/.test(text[i]) || text[i] === ",")) i++;

      if (i >= n || text[i] === closeChar) break;

      // Read field name
      let fieldName = "";
      while (i < n && text[i] !== "=" && text[i] !== "}" && !/\s/.test(text[i])) {
        fieldName += text[i++];
      }
      fieldName = fieldName.trim().toLowerCase();

      if (!fieldName) { i++; continue; }

      // Skip = sign
      while (i < n && /\s/.test(text[i])) i++;
      if (i < n && text[i] === "=") i++;
      while (i < n && /\s/.test(text[i])) i++;

      if (i >= n) break;

      // Read value
      let value = "";
      if (text[i] === "{") {
        // Braced value — capture inner content, tracking depth
        i++; // consume opening {
        let depth = 1;
        while (i < n && depth > 0) {
          if (text[i] === "{") { depth++; value += "{"; }
          else if (text[i] === "}") {
            depth--;
            if (depth > 0) value += "}";
          } else {
            value += text[i];
          }
          i++;
        }
      } else if (text[i] === '"') {
        i++; // consume opening "
        while (i < n && text[i] !== '"') value += text[i++];
        if (i < n) i++; // consume closing "
      } else {
        // Unquoted (number or @string reference)
        while (i < n && text[i] !== "," && text[i] !== "}" && text[i] !== ")") {
          value += text[i++];
        }
        value = value.trim();
      }

      if (fieldName) fields[fieldName] = value;
    }

    // Consume closing brace
    if (i < n && (text[i] === "}" || text[i] === ")")) i++;

    if (key) {
      entries.push({ key, type, fields });
    } else {
      errors.push(`Entry of type @${type} is missing a citation key`);
    }
  }

  return { entries, errors };
}

// ─── Serializer ───────────────────────────────────────────────────────────────

export function serializeEntry(entry: BibEntry): string {
  const config = ENTRY_TYPES[entry.type];
  const fieldOrder = config
    ? [...config.required, ...config.optional]
    : [];

  // Sort fields: required/optional first (in order), then alphabetical for the rest
  const sortedFields = Object.entries(entry.fields)
    .filter(([, v]) => v.trim() !== "")
    .sort(([a], [b]) => {
      const ai = fieldOrder.indexOf(a);
      const bi = fieldOrder.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

  const maxKeyLen = Math.max(0, ...sortedFields.map(([k]) => k.length));
  const pad = Math.min(maxKeyLen, 14);

  const fieldLines = sortedFields
    .map(([k, v]) => `  ${k.padEnd(pad)} = {${v}}`)
    .join(",\n");

  return `@${entry.type}{${entry.key},\n${fieldLines}\n}`;
}

export function serializeBibTeX(entries: BibEntry[]): string {
  return entries.map(serializeEntry).join("\n\n") + "\n";
}

// ─── Citation key generator ───────────────────────────────────────────────────

const STOPWORDS = new Set([
  "a", "an", "the", "of", "in", "on", "at", "to", "for",
  "and", "or", "but", "with", "from", "by", "as", "is",
  "are", "was", "were", "be", "been",
]);

function toAscii(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics (á→a, ñ→n, ü→u…)
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function extractLastName(authorField: string): string {
  if (!authorField.trim()) return "";
  const firstAuthor = authorField.split(/\s+and\s+/i)[0].trim();
  // "Last, First" format
  if (firstAuthor.includes(",")) return toAscii(firstAuthor.split(",")[0]);
  // "First Last" format — take last word
  const parts = firstAuthor.split(/\s+/);
  return toAscii(parts[parts.length - 1]);
}

function extractTitleWord(title: string): string {
  const clean = title.replace(/[{}\\]/g, "").replace(/\s+/g, " ");
  const words = clean.split(" ").map(w => w.toLowerCase());
  // Accept words starting with any Latin letter, including accented (á é í ó ú ü ñ ç…)
  const meaningful = words.find(
    w => w.length > 3 && !STOPWORDS.has(w) && /^[a-zÀ-ÖØ-öø-ÿ]/u.test(w)
  );
  return toAscii(meaningful || words[0] || "");
}

export function generateKey(entry: BibEntry): string {
  const { fields } = entry;
  const authorField = fields.author || fields.editor || "";
  const lastName = extractLastName(authorField);
  const year = (fields.year || "").replace(/\D/g, "").slice(-4);
  const titleWord = extractTitleWord(fields.title || "");

  const key = `${lastName}${year}${titleWord}`.slice(0, 50);
  return key || "ref";
}

// ─── Validator ────────────────────────────────────────────────────────────────

export function areBracesBalanced(s: string): boolean {
  let depth = 0;
  for (const c of s) {
    if (c === "{") depth++;
    else if (c === "}") depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
}

export interface ValidationIssue {
  field?: string;
  message: string;
  severity: "error" | "warning";
}

export function validateEntry(entry: BibEntry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Citation key
  if (!entry.key) {
    issues.push({ message: "La clave de citación está vacía", severity: "error" });
  } else if (/\s/.test(entry.key)) {
    issues.push({ message: "La clave de citación no puede contener espacios", severity: "error" });
  } else if (/[^a-zA-Z0-9_:\-.]/.test(entry.key)) {
    issues.push({
      message: "La clave contiene caracteres especiales — algunos compiladores pueden fallar",
      severity: "warning",
    });
  }

  // Required fields
  const config = ENTRY_TYPES[entry.type];
  if (config) {
    for (const field of config.required) {
      if (!entry.fields[field]?.trim()) {
        issues.push({
          field,
          message: `Campo requerido para @${entry.type}: ${field}`,
          severity: "error",
        });
      }
    }
  }

  // Balanced braces in all values
  for (const [field, value] of Object.entries(entry.fields)) {
    if (value && !areBracesBalanced(value)) {
      issues.push({
        field,
        message: `Llaves desbalanceadas en el campo "${field}"`,
        severity: "error",
      });
    }
  }

  // URL/DOI warnings
  if (entry.fields.doi?.startsWith("http")) {
    issues.push({
      field: "doi",
      message: 'El campo "doi" debe contener solo el identificador (e.g. 10.1145/…), no la URL completa',
      severity: "warning",
    });
  }

  return issues;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Display-friendly label for a field name */
export function fieldLabel(field: string): string {
  const LABELS: Record<string, string> = {
    author: "Autor(es)",
    editor: "Editor(es)",
    title: "Título",
    journal: "Revista",
    booktitle: "Título del libro/congreso",
    year: "Año",
    volume: "Volumen",
    number: "Número",
    pages: "Páginas",
    month: "Mes",
    publisher: "Editorial",
    address: "Dirección/Ciudad",
    edition: "Edición",
    chapter: "Capítulo",
    school: "Universidad/Escuela",
    institution: "Institución",
    organization: "Organización",
    howpublished: "Publicado como",
    note: "Nota",
    url: "URL",
    doi: "DOI",
    isbn: "ISBN",
    issn: "ISSN",
    series: "Serie",
    type: "Tipo",
    eprint: "eprint",
    archiveprefix: "Archivo",
    primaryclass: "Clase primaria",
  };
  return LABELS[field] ?? field;
}

/** Get all fields to show for an entry type (required + optional, in order) */
export function getFieldsForType(type: string): string[] {
  const config = ENTRY_TYPES[type];
  if (!config) return ["author", "title", "year", "url", "note"];
  return [...config.required, ...config.optional];
}

/** Collect all .bib file paths from a FileEntry tree */
export function collectBibFiles(tree: import("../types").FileEntry | null): string[] {
  if (!tree) return [];
  const result: string[] = [];
  function walk(node: import("../types").FileEntry) {
    if (!node.is_dir && node.extension === "bib") {
      result.push(node.path);
    }
    node.children?.forEach(walk);
  }
  walk(tree);
  return result;
}
