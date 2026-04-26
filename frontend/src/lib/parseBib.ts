export interface BibEntry {
  key: string;
  type: string;
  title?: string;
  author?: string;
  year?: string;
}

// Extract a named field value from the body of a bib entry.
// Handles {nested {braces}}, "quoted", and bare numeric values.
function extractField(body: string, fieldName: string): string | undefined {
  const pattern = new RegExp(`\\b${fieldName}\\s*=\\s*`, "i");
  const match = pattern.exec(body);
  if (!match) return undefined;

  let i = match.index + match[0].length;
  while (i < body.length && (body[i] === " " || body[i] === "\t" || body[i] === "\n" || body[i] === "\r")) i++;
  if (i >= body.length) return undefined;

  let value = "";

  if (body[i] === "{") {
    i++;
    let depth = 1;
    while (i < body.length && depth > 0) {
      const ch = body[i];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) break;
      }
      value += ch;
      i++;
    }
  } else if (body[i] === '"') {
    i++;
    while (i < body.length && body[i] !== '"') {
      value += body[i];
      i++;
    }
  } else {
    // bare value (numbers, string macros)
    while (i < body.length && body[i] !== "," && body[i] !== "\n" && body[i] !== "}") {
      value += body[i];
      i++;
    }
    value = value.trim();
  }

  return value || undefined;
}

export function parseBibFile(content: string): BibEntry[] {
  const entries: BibEntry[] = [];
  let i = 0;

  while (i < content.length) {
    const atIdx = content.indexOf("@", i);
    if (atIdx === -1) break;
    i = atIdx + 1;

    // Read entry type
    let type = "";
    while (i < content.length && /\w/.test(content[i])) {
      type += content[i++];
    }
    if (!type) continue;
    type = type.toLowerCase();

    // Skip whitespace
    while (i < content.length && /\s/.test(content[i])) i++;

    // Expect opening brace
    if (i >= content.length || content[i] !== "{") continue;
    i++;

    // Skip non-entry directives
    if (type === "comment" || type === "string" || type === "preamble") {
      let depth = 1;
      while (i < content.length && depth > 0) {
        if (content[i] === "{") depth++;
        else if (content[i] === "}") depth--;
        i++;
      }
      continue;
    }

    // Read citation key (up to first comma)
    while (i < content.length && /\s/.test(content[i])) i++;
    let key = "";
    while (i < content.length && content[i] !== "," && content[i] !== "}" && content[i] !== "\n") {
      key += content[i++];
    }
    key = key.trim();
    if (!key) continue;

    if (i < content.length && content[i] === ",") i++;

    // Collect the entry body until matching closing brace
    const bodyStart = i;
    let depth = 1;
    while (i < content.length && depth > 0) {
      if (content[i] === "{") depth++;
      else if (content[i] === "}") {
        depth--;
        if (depth === 0) break;
      }
      i++;
    }
    const body = content.slice(bodyStart, i);
    i++; // skip closing }

    entries.push({
      key,
      type,
      title: extractField(body, "title"),
      author: extractField(body, "author"),
      year: extractField(body, "year"),
    });
  }

  return entries;
}

// Parse \bibliography{name,name2} and \addbibresource{name.bib} from tex source.
export function parseBibReferences(texContent: string): string[] {
  const refs = new Set<string>();

  const bibRe = /\\bibliography\{([^}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = bibRe.exec(texContent)) !== null) {
    m[1].split(",").map((s) => s.trim()).filter(Boolean).forEach((r) => refs.add(r));
  }

  const addBibRe = /\\addbibresource\{([^}]+)\}/g;
  while ((m = addBibRe.exec(texContent)) !== null) {
    refs.add(m[1].trim());
  }

  return Array.from(refs);
}
