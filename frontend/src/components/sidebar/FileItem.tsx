import { useCallback, useEffect, useRef, useState } from "react";
import { readFile, renameEntry } from "../../lib/tauri";
import { useAppStore } from "../../store/useAppStore";
import { ContextMenu } from "./ContextMenu";
import type { FileEntry } from "../../types";

// ─── Icons ────────────────────────────────────────────────────────────────────

function FileIcon({ entry, isOpen }: { entry: FileEntry; isOpen?: boolean }) {
  if (entry.is_dir) {
    return (
      <svg
        width="14" height="14" viewBox="0 0 24 24"
        fill="currentColor" className="text-zinc-400 shrink-0"
      >
        {isOpen
          ? <path d="M2 6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v1H2V6zm0 3h20v9a2 2 0 01-2 2H4a2 2 0 01-2-2V9z" />
          : <path d="M2 6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        }
      </svg>
    );
  }
  const ext = entry.extension ?? "";
  if (ext === "tex")
    return <span className="text-emerald-500 text-[13px] font-bold shrink-0 leading-none">τ</span>;
  if (ext === "pdf")
    return <span className="text-red-500 text-[11px] font-bold shrink-0">PDF</span>;
  if (ext === "bib")
    return <span className="text-blue-400 text-[13px] font-bold shrink-0 leading-none">β</span>;
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext))
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" className="text-purple-400 shrink-0">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    );
  if (["sty", "cls"].includes(ext))
    return <span className="text-orange-400 text-[11px] font-bold shrink-0">S</span>;
  return <span className="text-zinc-600 text-[13px] shrink-0">·</span>;
}

// ─── FileItem ─────────────────────────────────────────────────────────────────

interface FileItemProps {
  entry: FileEntry;
  depth: number;
  isRenaming: boolean;
  onRenameStart: () => void;
  onRenameEnd: () => void;
  onRefresh: () => Promise<void>;
}

export function FileItem({
  entry,
  depth,
  isRenaming,
  onRenameStart,
  onRenameEnd,
  onRefresh,
}: FileItemProps) {
  const { activeFilePath, rootFilePath, openFile, setRootFilePath } = useAppStore();
  const [expanded, setExpanded] = useState(depth < 1);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) renameRef.current?.select();
  }, [isRenaming]);

  const handleOpen = useCallback(async () => {
    if (!entry.extension || entry.extension !== "tex") return;
    try {
      const content = await readFile(entry.path);
      openFile(entry.path, content);
    } catch (err) {
      console.error("Error al abrir archivo:", err);
    }
  }, [entry, openFile]);

  const handleRenameCommit = useCallback(async () => {
    const newName = renameRef.current?.value.trim() ?? "";
    if (!newName || newName === entry.name) {
      onRenameEnd();
      return;
    }
    try {
      const newPath = await renameEntry(entry.path, newName);
      // Keep root in sync if it was this file
      if (rootFilePath === entry.path) setRootFilePath(newPath);
      await onRefresh();
    } catch (err) {
      console.error("Error al renombrar:", err);
    } finally {
      onRenameEnd();
    }
  }, [entry, rootFilePath, setRootFilePath, onRefresh, onRenameEnd]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const indent = depth * 14;
  const isActive = activeFilePath === entry.path;
  const isRoot = rootFilePath === entry.path;
  const clickable = entry.is_dir || entry.extension === "tex";

  // ── Directory ──
  if (entry.is_dir) {
    return (
      <div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setExpanded((v) => !v)}
          onContextMenu={handleContextMenu}
          onKeyDown={(e) => e.key === "Enter" && setExpanded((v) => !v)}
          style={{ paddingLeft: 8 + indent }}
          className="flex items-center gap-1.5 pr-2 py-[5px] rounded cursor-pointer
                     text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50
                     group transition-colors select-none"
        >
          <span className="text-[10px] text-zinc-600 w-2.5 shrink-0">
            {expanded ? "▾" : "▸"}
          </span>

          {isRenaming ? (
            <input
              ref={renameRef}
              defaultValue={entry.name}
              className="flex-1 min-w-0 bg-zinc-700 rounded px-1 text-xs text-zinc-100
                         outline-none border border-emerald-600"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameCommit();
                if (e.key === "Escape") onRenameEnd();
              }}
              onBlur={handleRenameCommit}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <>
              <FileIcon entry={entry} isOpen={expanded} />
              <span className="text-xs truncate flex-1">{entry.name}</span>
            </>
          )}
        </div>

        {expanded && (entry.children ?? []).map((child) => (
          <ConnectedFileItem
            key={child.path}
            entry={child}
            depth={depth + 1}
            onRefresh={onRefresh}
          />
        ))}

        {contextMenu && (
          <ContextMenu
            entry={entry}
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onStartRename={onRenameStart}
            onRefresh={onRefresh}
          />
        )}
      </div>
    );
  }

  // ── File ──
  return (
    <div className="group relative">
      <div
        role="button"
        tabIndex={0}
        onClick={handleOpen}
        onContextMenu={handleContextMenu}
        onKeyDown={(e) => e.key === "Enter" && handleOpen()}
        style={{ paddingLeft: 8 + indent }}
        className={`
          flex items-center gap-1.5 pr-2 py-[5px] rounded transition-colors
          select-none
          ${isActive
            ? "bg-emerald-900/30 text-emerald-300"
            : clickable
            ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 cursor-pointer"
            : "text-zinc-600 cursor-default opacity-60"
          }
        `}
      >
        {/* Root indicator replaces icon */}
        {isRoot ? (
          <span className="text-emerald-400 text-[11px] shrink-0 leading-none font-bold">⊙</span>
        ) : (
          <FileIcon entry={entry} />
        )}

        {isRenaming ? (
          <input
            ref={renameRef}
            defaultValue={entry.name}
            className="flex-1 min-w-0 bg-zinc-700 rounded px-1 text-xs text-zinc-100
                       outline-none border border-emerald-600"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameCommit();
              if (e.key === "Escape") onRenameEnd();
            }}
            onBlur={handleRenameCommit}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <>
            <span className="text-xs truncate flex-1">{entry.name}</span>
            {isRoot && (
              <span className="text-[9px] text-emerald-700 shrink-0 font-medium">
                raíz
              </span>
            )}
          </>
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          entry={entry}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onStartRename={onRenameStart}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}

// ─── Connected wrapper ────────────────────────────────────────────────────────
// Manages the isRenaming state locally so FileTreePanel stays clean.

interface ConnectedProps {
  entry: FileEntry;
  depth: number;
  onRefresh: () => Promise<void>;
}

export function ConnectedFileItem({ entry, depth, onRefresh }: ConnectedProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  return (
    <FileItem
      entry={entry}
      depth={depth}
      isRenaming={isRenaming}
      onRenameStart={() => setIsRenaming(true)}
      onRenameEnd={() => setIsRenaming(false)}
      onRefresh={onRefresh}
    />
  );
}
