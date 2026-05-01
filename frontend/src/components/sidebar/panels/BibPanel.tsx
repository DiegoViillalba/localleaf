import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "../../../store/useAppStore";
import { readFile, saveFile, createFile, scanProject, fetchBibtexFromDoi, fetchBibtexFromArxiv, fetchBibtexFromIsbn } from "../../../lib/tauri";
import {
  parseBibTeX,
  serializeBibTeX,
  serializeEntry,
  generateKey,
  validateEntry,
  collectBibFiles,
  ENTRY_TYPES,
  fieldLabel,
  getFieldsForType,
  type BibEntry,
  type ValidationIssue,
} from "../../../lib/bibtex";

// ─── Type badge colours ───────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  article:       "bg-blue-900/50 text-blue-300 border-blue-700/40",
  book:          "bg-violet-900/50 text-violet-300 border-violet-700/40",
  inproceedings: "bg-emerald-900/50 text-emerald-300 border-emerald-700/40",
  incollection:  "bg-teal-900/50 text-teal-300 border-teal-700/40",
  phdthesis:     "bg-amber-900/50 text-amber-300 border-amber-700/40",
  mastersthesis: "bg-orange-900/50 text-orange-300 border-orange-700/40",
  techreport:    "bg-rose-900/50 text-rose-300 border-rose-700/40",
  misc:          "bg-zinc-800 text-zinc-400 border-zinc-700/40",
  unpublished:   "bg-zinc-800 text-zinc-400 border-zinc-700/40",
};

function typeBadge(type: string) {
  const cls = TYPE_COLOR[type] ?? "bg-zinc-800 text-zinc-400 border-zinc-700/40";
  const label = ENTRY_TYPES[type]?.label ?? type;
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${cls}`}>
      {label}
    </span>
  );
}

// ─── Import bar ───────────────────────────────────────────────────────────────

function detectImportType(query: string): "doi" | "arxiv" | "isbn" | null {
  const q = query.trim();
  if (/^10\.\d{4,}\//.test(q) || q.startsWith("https://doi.org/")) return "doi";
  if (/^\d{4}\.\d{4,5}(v\d+)?$/.test(q) || /^[a-z\-]+\/\d{7}$/.test(q) || q.includes("arxiv.org/abs/")) return "arxiv";
  if (/^(isbn:?)?\d[\d\-]{8,16}\d$/i.test(q.replace(/\s/g, ""))) return "isbn";
  return null;
}

function ImportBar({ onImport }: { onImport: (bibtex: string) => void }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kind = detectImportType(query);

  const handleImport = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      let bibtex: string;
      if (kind === "doi") bibtex = await fetchBibtexFromDoi(q);
      else if (kind === "arxiv") bibtex = await fetchBibtexFromArxiv(q);
      else if (kind === "isbn") bibtex = await fetchBibtexFromIsbn(q);
      else throw new Error("No se pudo detectar el tipo. Usa un DOI (10.…), arXiv ID (2301.07041) o ISBN.");
      onImport(bibtex);
      setQuery("");
    } catch (e) {
      setError(String(e).replace("Error: ", ""));
    } finally {
      setLoading(false);
    }
  };

  const HINT: Record<string, string> = { doi: "DOI", arxiv: "arXiv", isbn: "ISBN" };

  return (
    <div className="px-2 pb-2 border-b border-zinc-800">
      <div className="flex gap-1 mt-1">
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setError(null); }}
          onKeyDown={e => e.key === "Enter" && handleImport()}
          placeholder="DOI · arXiv ID · ISBN"
          className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 outline-none focus:border-emerald-500 transition-colors placeholder-zinc-600"
        />
        <button
          onClick={handleImport}
          disabled={loading || !query.trim()}
          title="Importar referencia"
          className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs rounded transition-colors font-medium"
        >
          {loading ? "…" : kind ? HINT[kind] : "↓"}
        </button>
      </div>
      {error && <p className="text-[10px] text-red-400 mt-1 leading-snug">{error}</p>}
    </div>
  );
}

// ─── Entry card ───────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  onEdit,
  onDelete,
  onCopyKey,
}: {
  entry: BibEntry;
  onEdit: () => void;
  onDelete: () => void;
  onCopyKey: () => void;
}) {
  const issues = validateEntry(entry);
  const errors = issues.filter(i => i.severity === "error");
  const warnings = issues.filter(i => i.severity === "warning");

  const authors = entry.fields.author || entry.fields.editor || "";
  const firstAuthor = authors.split(/\s+and\s+/i)[0]?.trim();
  const authorDisplay = firstAuthor
    ? (authors.includes(" and ") ? `${firstAuthor} et al.` : firstAuthor)
    : null;

  return (
    <div className="group border border-zinc-800 hover:border-zinc-700 rounded-md p-2 bg-zinc-900/40 transition-colors">
      {/* Header row */}
      <div className="flex items-start gap-1.5 mb-1">
        {typeBadge(entry.type)}
        <span className="font-mono text-[10px] text-emerald-400 leading-none mt-0.5 truncate flex-1">
          {entry.key}
        </span>
        {errors.length > 0 && (
          <span title={errors.map(e => e.message).join("\n")}
            className="text-red-400 text-[10px] leading-none mt-0.5">⚠</span>
        )}
        {warnings.length > 0 && errors.length === 0 && (
          <span title={warnings.map(w => w.message).join("\n")}
            className="text-amber-400 text-[10px] leading-none mt-0.5">!</span>
        )}
      </div>

      {/* Title */}
      <p className="text-xs text-zinc-200 leading-snug mb-0.5 line-clamp-2">
        {entry.fields.title?.replace(/[{}]/g, "") || <span className="italic text-zinc-500">[Sin título]</span>}
      </p>

      {/* Author + year */}
      <p className="text-[10px] text-zinc-500 truncate">
        {authorDisplay && <span>{authorDisplay.replace(/[{}]/g, "")}</span>}
        {authorDisplay && entry.fields.year && <span className="mx-1">·</span>}
        {entry.fields.year && <span>{entry.fields.year}</span>}
        {entry.fields.journal && <span className="ml-1 italic">· {entry.fields.journal.replace(/[{}]/g, "")}</span>}
        {entry.fields.booktitle && !entry.fields.journal && (
          <span className="ml-1 italic">· {entry.fields.booktitle.replace(/[{}]/g, "")}</span>
        )}
      </p>

      {/* Action bar — shown on hover */}
      <div className="flex gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit}
          className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">
          Editar
        </button>
        <button onClick={onCopyKey}
          title="Copiar clave de citación"
          className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">
          \cite
        </button>
        {entry.fields.doi && (
          <a href={`https://doi.org/${entry.fields.doi}`} target="_blank" rel="noreferrer"
            className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">
            DOI↗
          </a>
        )}
        {entry.fields.url && !entry.fields.doi && (
          <a href={entry.fields.url} target="_blank" rel="noreferrer"
            className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">
            URL↗
          </a>
        )}
        <button onClick={onDelete}
          className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-red-900/60 hover:text-red-300 text-zinc-500 transition-colors ml-auto">
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── Entry editor modal ───────────────────────────────────────────────────────

const BLANK_ENTRY = (): BibEntry => ({
  key: "",
  type: "article",
  fields: {},
});

function EntryEditor({
  initial,
  existingKeys,
  onSave,
  onCancel,
}: {
  initial: BibEntry;
  existingKeys: string[];
  onSave: (entry: BibEntry) => void;
  onCancel: () => void;
}) {
  const [entry, setEntry] = useState<BibEntry>(() => ({
    ...initial,
    fields: { ...initial.fields },
  }));
  const [keyAutoGenerated, setKeyAutoGenerated] = useState(!initial.key);

  const setField = (field: string, value: string) => {
    setEntry(e => {
      const next = { ...e, fields: { ...e.fields, [field]: value } };
      if (keyAutoGenerated) {
        const generated = generateKey(next);
        return { ...next, key: generated };
      }
      return next;
    });
  };

  const setType = (type: string) => setEntry(e => ({ ...e, type }));
  const setKey = (key: string) => { setKeyAutoGenerated(false); setEntry(e => ({ ...e, key })); }

  const issues = validateEntry(entry);
  const dupKey = entry.key && existingKeys.includes(entry.key) && entry.key !== initial.key;
  const canSave = !issues.some(i => i.severity === "error") && !dupKey && entry.key.trim();

  const fieldList = getFieldsForType(entry.type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
          <h3 className="text-sm font-semibold text-zinc-200">
            {initial.key ? "Editar referencia" : "Nueva referencia"}
          </h3>
          <button onClick={onCancel} className="text-zinc-500 hover:text-zinc-300 text-lg leading-none">×</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
          {/* Type + Key */}
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Tipo</span>
              <select
                value={entry.type}
                onChange={e => setType(e.target.value)}
                className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 outline-none focus:border-emerald-500">
                {Object.entries(ENTRY_TYPES).map(([t, cfg]) => (
                  <option key={t} value={t}>{cfg.label}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Clave de citación
                {keyAutoGenerated && <span className="ml-1 text-emerald-600">(auto)</span>}
              </span>
              <input
                value={entry.key}
                onChange={e => setKey(e.target.value)}
                placeholder="ej. einstein1905"
                className={`bg-zinc-950 border rounded px-2 py-1 text-xs font-mono outline-none transition-colors
                  ${dupKey ? "border-red-600 focus:border-red-500" : "border-zinc-700 focus:border-emerald-500"}`}
              />
              {dupKey && <span className="text-[10px] text-red-400">Clave duplicada</span>}
            </label>
          </div>

          {/* Fields */}
          {fieldList.map(field => {
            const fieldIssues = issues.filter(i => i.field === field);
            const isRequired = ENTRY_TYPES[entry.type]?.required.includes(field);
            const isTextarea = ["abstract", "note", "annote"].includes(field) ||
              ["title", "booktitle", "author"].includes(field);

            return (
              <label key={field} className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  {fieldLabel(field)}
                  {isRequired && <span className="ml-1 text-red-500">*</span>}
                </span>
                {isTextarea ? (
                  <textarea
                    rows={field === "author" ? 2 : 3}
                    value={entry.fields[field] ?? ""}
                    onChange={e => setField(field, e.target.value)}
                    className={`bg-zinc-950 border rounded px-2 py-1 text-xs text-zinc-200 outline-none resize-none transition-colors
                      ${fieldIssues.length ? "border-red-600" : "border-zinc-700 focus:border-emerald-500"}`}
                    placeholder={field === "author" ? "Apellido, Nombre and Apellido2, Nombre2" : ""}
                  />
                ) : (
                  <input
                    value={entry.fields[field] ?? ""}
                    onChange={e => setField(field, e.target.value)}
                    className={`bg-zinc-950 border rounded px-2 py-1 text-xs text-zinc-200 outline-none transition-colors
                      ${fieldIssues.length ? "border-red-600" : "border-zinc-700 focus:border-emerald-500"}`}
                    placeholder={field === "doi" ? "10.XXXX/YYYY" : field === "year" ? "2024" : ""}
                  />
                )}
                {fieldIssues.map((iss, i) => (
                  <span key={i} className={`text-[10px] leading-snug ${iss.severity === "error" ? "text-red-400" : "text-amber-400"}`}>
                    {iss.message}
                  </span>
                ))}
              </label>
            );
          })}

          {/* Global issues not tied to a field */}
          {issues.filter(i => !i.field).map((iss, i) => (
            <p key={i} className={`text-[10px] ${iss.severity === "error" ? "text-red-400" : "text-amber-400"}`}>
              {iss.message}
            </p>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-4 py-3 border-t border-zinc-800 shrink-0 gap-2">
          <div className="text-[10px] text-zinc-600">
            {issues.filter(i => i.severity === "error").length > 0
              ? `${issues.filter(i => i.severity === "error").length} error(es)`
              : issues.filter(i => i.severity === "warning").length > 0
              ? `${issues.filter(i => i.severity === "warning").length} advertencia(s)`
              : <span className="text-emerald-600">Sin errores</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel}
              className="px-3 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
              Cancelar
            </button>
            <button
              onClick={() => canSave && onSave(entry)}
              disabled={!canSave}
              className="px-3 py-1 text-xs bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white rounded transition-colors font-medium">
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Delete confirmation ──────────────────────────────────────────────────────

function DeleteConfirm({ entry, onConfirm, onCancel }: {
  entry: BibEntry;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-80 p-5 text-center">
        <p className="text-sm text-zinc-200 mb-1">¿Eliminar esta referencia?</p>
        <p className="font-mono text-xs text-emerald-400 mb-4">{entry.key}</p>
        <div className="flex gap-2 justify-center">
          <button onClick={onCancel}
            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="px-3 py-1.5 text-xs bg-red-700 hover:bg-red-600 text-white rounded transition-colors font-medium">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BibTeX tips tooltip ──────────────────────────────────────────────────────

function BibTeXTips() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="text-zinc-600 hover:text-zinc-400 transition-colors"
        title="Consejos BibTeX">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-5 z-50 w-72 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl p-3 text-[10px] text-zinc-400 space-y-1.5">
          <p className="text-zinc-300 font-semibold mb-2">Consejos BibTeX</p>
          <p><span className="text-emerald-400 font-mono">author</span> → <code>Apellido, Nombre and Apellido2, Nombre2</code></p>
          <p><span className="text-emerald-400 font-mono">title</span> → Protege mayúsculas con llaves: <code>{"{NASA}"}</code></p>
          <p><span className="text-emerald-400 font-mono">doi</span> → Solo el identificador: <code>10.1145/123</code>, no la URL</p>
          <p><span className="text-emerald-400 font-mono">pages</span> → Usa doble guion: <code>10--20</code></p>
          <p>Caracteres especiales: <code>\&amp;</code> <code>\%</code> <code>\$</code> <code>\_</code></p>
          <p>Las llaves deben estar <span className="text-amber-400">balanceadas</span> en cada campo</p>
          <button onClick={() => setOpen(false)} className="mt-1 text-zinc-600 hover:text-zinc-400">Cerrar</button>
        </div>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function BibPanel() {
  const projectTree = useAppStore(s => s.projectTree);
  const workspaceDir = useAppStore(s => s.workspaceDir);

  const [bibFiles, setBibFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [entries, setEntries] = useState<BibEntry[]>([]);
  const [rawContent, setRawContent] = useState("");
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [editingEntry, setEditingEntry] = useState<BibEntry | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingEntry, setDeletingEntry] = useState<BibEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  // Scan for .bib files when project tree changes
  useEffect(() => {
    const found = collectBibFiles(projectTree);
    setBibFiles(found);
    if (found.length > 0 && !selectedFile) {
      setSelectedFile(found[0]);
    } else if (found.length === 0) {
      setSelectedFile(null);
      setEntries([]);
    }
  }, [projectTree]);

  // Load selected .bib file
  useEffect(() => {
    if (!selectedFile) return;
    readFile(selectedFile).then(content => {
      setRawContent(content);
      const { entries: parsed, errors } = parseBibTeX(content);
      setEntries(parsed);
      setParseErrors(errors);
    }).catch(e => setParseErrors([String(e)]));
  }, [selectedFile]);

  // Persist entries to disk
  const persist = useCallback(async (newEntries: BibEntry[]) => {
    if (!selectedFile) return;
    setSaving(true);
    const text = serializeBibTeX(newEntries);
    await saveFile(selectedFile, text);
    setRawContent(text);
    setSaving(false);
  }, [selectedFile]);

  // Save edited entry
  const handleSaveEntry = async (updated: BibEntry) => {
    const idx = entries.findIndex(e => e.key === (editingEntry?.key ?? "__new__"));
    let newEntries: BibEntry[];
    if (idx >= 0) {
      newEntries = entries.map((e, i) => i === idx ? updated : e);
    } else {
      newEntries = [...entries, updated];
    }
    setEntries(newEntries);
    setEditingEntry(null);
    setIsCreating(false);
    await persist(newEntries);
  };

  // Delete entry
  const handleDelete = async () => {
    if (!deletingEntry) return;
    const newEntries = entries.filter(e => e.key !== deletingEntry.key);
    setEntries(newEntries);
    setDeletingEntry(null);
    await persist(newEntries);
  };

  // Import from DOI/arXiv/ISBN
  const handleImport = async (bibtex: string) => {
    const { entries: imported } = parseBibTeX(bibtex);
    if (imported.length === 0) return;
    // Avoid duplicate keys
    const existingKeys = new Set(entries.map(e => e.key));
    const deduped = imported.map(e => {
      if (!existingKeys.has(e.key)) return e;
      let n = 2;
      while (existingKeys.has(`${e.key}${n}`)) n++;
      return { ...e, key: `${e.key}${n}` };
    });
    const newEntries = [...entries, ...deduped];
    setEntries(newEntries);
    await persist(newEntries);
  };

  // Copy cite key
  const copyKey = (key: string) => {
    navigator.clipboard.writeText(`\\cite{${key}}`);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  // Filter
  const filtered = entries.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.key.toLowerCase().includes(q) ||
      (e.fields.title ?? "").toLowerCase().includes(q) ||
      (e.fields.author ?? "").toLowerCase().includes(q) ||
      (e.fields.journal ?? "").toLowerCase().includes(q) ||
      (e.fields.year ?? "").includes(q)
    );
  });

  const existingKeys = entries.map(e => e.key);

  // ── No project open ──
  if (!workspaceDir) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-zinc-500 gap-2 p-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
        <p className="text-xs text-center">Abre un proyecto para gestionar la bibliografía</p>
      </div>
    );
  }

  // ── No .bib files found ──
  if (bibFiles.length === 0) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="shrink-0 px-3 py-2.5 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Bibliografía</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4 text-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <p className="text-xs text-zinc-500">No se encontró ningún archivo <code className="font-mono">.bib</code> en el proyecto.</p>
          <button
            onClick={async () => {
              if (!workspaceDir) return;
              const path = await createFile(workspaceDir, "references.bib");
              const tree = await scanProject(workspaceDir);
              useAppStore.getState().setProjectTree(tree);
              setSelectedFile(path);
            }}
            className="px-3 py-1.5 text-xs bg-emerald-700 hover:bg-emerald-600 text-white rounded transition-colors">
            Crear references.bib
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* ── Header ── */}
      <div className="shrink-0 px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Bibliografía</span>
          <div className="flex items-center gap-1">
            {saving && <span className="text-[9px] text-zinc-600">guardando…</span>}
            <BibTeXTips />
            <button
              onClick={() => setShowRaw(o => !o)}
              title={showRaw ? "Ver tarjetas" : "Ver BibTeX raw"}
              className={`text-zinc-600 hover:text-zinc-400 transition-colors ${showRaw ? "text-emerald-500" : ""}`}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
              </svg>
            </button>
            <button
              onClick={() => { setIsCreating(true); setEditingEntry(null); }}
              title="Nueva referencia"
              className="text-zinc-600 hover:text-emerald-400 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* File selector (shown only when >1 .bib file) */}
        {bibFiles.length > 1 && (
          <select
            value={selectedFile ?? ""}
            onChange={e => setSelectedFile(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-[10px] text-zinc-300 outline-none focus:border-emerald-500 mb-1.5">
            {bibFiles.map(f => (
              <option key={f} value={f}>{f.split("/").pop()}</option>
            ))}
          </select>
        )}

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600" width="11" height="11"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filtrar referencias…"
            className="w-full bg-zinc-900 border border-zinc-800 rounded pl-6 pr-2 py-1 text-[11px] text-zinc-300 outline-none focus:border-emerald-600 placeholder-zinc-600 transition-colors"
          />
        </div>
      </div>

      {/* ── Import bar ── */}
      <ImportBar onImport={handleImport} />

      {/* ── Entry list ── */}
      <div className="flex-1 overflow-y-auto">
        {parseErrors.length > 0 && (
          <div className="mx-2 mt-2 p-2 bg-red-950/40 border border-red-800/40 rounded text-[10px] text-red-400">
            {parseErrors.map((e, i) => <p key={i}>{e}</p>)}
          </div>
        )}

        {showRaw ? (
          <pre className="p-3 text-[10px] font-mono text-zinc-400 leading-relaxed whitespace-pre-wrap break-all">
            {rawContent || "# Archivo vacío"}
          </pre>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-zinc-600 text-xs gap-1">
            {entries.length === 0
              ? <p>Sin referencias. Añade una con <strong>+</strong> o importa vía DOI/arXiv/ISBN.</p>
              : <p>Sin resultados para «{search}»</p>}
          </div>
        ) : (
          <div className="p-2 space-y-1.5">
            <p className="text-[9px] text-zinc-600 px-1 mb-2">
              {filtered.length} de {entries.length} referencia{entries.length !== 1 ? "s" : ""}
              {selectedFile && <span className="ml-1">· {selectedFile.split("/").pop()}</span>}
            </p>
            {filtered.map(entry => (
              <div key={entry.key} className="relative">
                {copied === entry.key && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900/80 rounded-md text-[10px] text-emerald-400">
                    ✓ \\cite{`{${entry.key}}`} copiado
                  </div>
                )}
                <EntryCard
                  entry={entry}
                  onEdit={() => { setEditingEntry(entry); setIsCreating(false); }}
                  onDelete={() => setDeletingEntry(entry)}
                  onCopyKey={() => copyKey(entry.key)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {(editingEntry || isCreating) && (
        <EntryEditor
          initial={editingEntry ?? BLANK_ENTRY()}
          existingKeys={existingKeys}
          onSave={handleSaveEntry}
          onCancel={() => { setEditingEntry(null); setIsCreating(false); }}
        />
      )}
      {deletingEntry && (
        <DeleteConfirm
          entry={deletingEntry}
          onConfirm={handleDelete}
          onCancel={() => setDeletingEntry(null)}
        />
      )}
    </div>
  );
}
