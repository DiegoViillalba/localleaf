import { useRef, useState } from "react";
import { readFile } from "../../../lib/tauri";
import { useAppStore } from "../../../store/useAppStore";
import type { FileEntry } from "../../../types";

interface Match {
  file: FileEntry;
  line: number;
  text: string;
}

function collectFiles(entry: FileEntry, results: FileEntry[] = []): FileEntry[] {
  if (!entry.is_dir && entry.extension === "tex") results.push(entry);
  for (const child of entry.children ?? []) collectFiles(child, results);
  return results;
}

export function SearchPanel() {
  const { projectTree, openFile } = useAppStore();
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q || !projectTree) return;
    setSearching(true);
    setMatches([]);
    const files = collectFiles(projectTree);
    const found: Match[] = [];
    for (const file of files) {
      try {
        const content = await readFile(file.path);
        content.split("\n").forEach((text, idx) => {
          if (text.toLowerCase().includes(q.toLowerCase())) {
            found.push({ file, line: idx + 1, text: text.trim() });
          }
        });
      } catch {
        // skip unreadable files
      }
    }
    setMatches(found);
    setSearching(false);
  };

  const handleOpen = async (match: Match) => {
    const content = await readFile(match.file.path);
    openFile(match.file.path, content);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-3 border-b border-zinc-800 shrink-0">
        <p className="text-xs font-semibold text-zinc-300 mb-2">Buscar en proyecto</p>
        <div className="flex gap-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Buscar texto…"
            className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded
                       px-2 py-1.5 text-xs text-zinc-200 outline-none
                       focus:border-emerald-600 transition-colors"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="px-2.5 py-1.5 rounded bg-zinc-700 text-zinc-300 text-xs
                       hover:bg-zinc-600 disabled:opacity-40 transition-colors"
          >
            {searching ? "…" : "↵"}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {matches.length === 0 && !searching && query && (
          <p className="text-xs text-zinc-600 px-4 py-6 text-center">
            Sin resultados para "{query}"
          </p>
        )}
        {matches.map((m, i) => (
          <button
            key={i}
            onClick={() => handleOpen(m)}
            className="w-full text-left px-3 py-2 border-b border-zinc-900
                       hover:bg-zinc-800/50 transition-colors"
          >
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-emerald-600 text-[10px] font-bold">τ</span>
              <span className="text-xs text-zinc-300 truncate flex-1">
                {m.file.name}
              </span>
              <span className="text-[10px] text-zinc-600 shrink-0">
                línea {m.line}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 truncate pl-4">{m.text}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
