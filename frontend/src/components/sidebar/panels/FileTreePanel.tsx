import { useCallback, useRef, useState } from "react";
import {
  createFile,
  createFolder,
  openFolderDialog,
  readFile,
  scanProject,
} from "../../../lib/tauri";
import { useAppStore } from "../../../store/useAppStore";
import { ConnectedFileItem } from "../FileItem";
import type { FileEntry } from "../../../types";

// ─── Root auto-detection ──────────────────────────────────────────────────────

function detectRoot(tree: FileEntry): string | null {
  const direct = tree.children ?? [];
  const mainTex = direct.find((f) => !f.is_dir && f.name === "main.tex");
  if (mainTex) return mainTex.path;
  const texFiles = direct.filter((f) => !f.is_dir && f.extension === "tex");
  if (texFiles.length === 1) return texFiles[0].path;
  return null;
}

// ─── New-item inline input ────────────────────────────────────────────────────

type NewItemType = "file" | "folder" | null;

interface NewItemInputProps {
  type: NewItemType;
  onCommit: (name: string) => void;
  onCancel: () => void;
}

function NewItemInput({ type, onCommit, onCancel }: NewItemInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-1.5 px-2 py-[5px]">
      <span className="text-zinc-500 text-[10px] w-2.5 shrink-0" />
      {type === "folder" ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
          className="text-zinc-400 shrink-0">
          <path d="M2 6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
      ) : (
        <span className="text-emerald-500 text-[13px] font-bold shrink-0 leading-none">τ</span>
      )}
      <input
        ref={inputRef}
        autoFocus
        placeholder={type === "folder" ? "nueva-carpeta" : "nuevo-archivo.tex"}
        className="flex-1 min-w-0 bg-zinc-700 border border-emerald-600 rounded px-1.5
                   text-xs text-zinc-100 outline-none"
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommit(inputRef.current?.value ?? "");
          if (e.key === "Escape") onCancel();
        }}
        onBlur={() => onCommit(inputRef.current?.value ?? "")}
      />
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function FileTreePanel() {
  const {
    workspaceDir,
    projectTree,
    setWorkspace,
    setProjectTree,
    openFile,
  } = useAppStore();

  const [newItemType, setNewItemType] = useState<NewItemType>(null);
  const [error, setError] = useState<string | null>(null);

  // Refresh the tree from disk
  const refresh = useCallback(async () => {
    if (!workspaceDir) return;
    const tree = await scanProject(workspaceDir);
    setProjectTree(tree);
  }, [workspaceDir, setProjectTree]);

  const handleOpenFolder = useCallback(async () => {
    const dir = await openFolderDialog();
    if (!dir) return;
    const tree = await scanProject(dir);
    const root = detectRoot(tree);
    setWorkspace(dir, tree, root);
  }, [setWorkspace]);

  const handleNewItem = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      setNewItemType(null);
      if (!trimmed || !workspaceDir) return;
      setError(null);
      try {
        if (newItemType === "file") {
          const path = await createFile(workspaceDir, trimmed);
          if (trimmed.endsWith(".tex")) {
            await refresh();
            const content = await readFile(path);
            openFile(path, content);
          } else {
            await refresh();
          }
        } else {
          await createFolder(workspaceDir, trimmed);
          await refresh();
        }
      } catch (err) {
        setError(String(err));
      }
    },
    [newItemType, workspaceDir, refresh, openFile]
  );

  const treeChildren = projectTree?.children ?? [];
  const folderName = workspaceDir
    ? workspaceDir.split("/").pop() ?? workspaceDir
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="shrink-0 border-b border-zinc-800">
        {/* Workspace name row */}
        <div className="flex items-center gap-1 px-3 py-2.5">
          <span className="text-xs font-semibold text-zinc-300 flex-1 truncate">
            {folderName ?? "Sin carpeta abierta"}
          </span>
          <button
            onClick={refresh}
            title="Recargar árbol"
            className="text-zinc-600 hover:text-zinc-300 transition-colors p-0.5 rounded"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>

        {/* Action buttons */}
        {workspaceDir && (
          <div className="flex items-center gap-0.5 px-2 pb-2">
            <ActionButton
              title="Nuevo archivo"
              onClick={() => { setNewItemType("file"); setError(null); }}
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              }
            />
            <ActionButton
              title="Nueva carpeta"
              onClick={() => { setNewItemType("folder"); setError(null); }}
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <line x1="9" y1="14" x2="15" y2="14" />
                </svg>
              }
            />
            <div className="flex-1" />
            <ActionButton
              title="Abrir carpeta"
              onClick={handleOpenFolder}
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              }
            />
          </div>
        )}
      </div>

      {/* Error toast */}
      {error && (
        <div className="px-3 py-1.5 text-xs text-red-400 bg-red-950/30 border-b border-red-900/40">
          {error}
          <button
            onClick={() => setError(null)}
            className="float-right text-red-600 hover:text-red-300"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {/* Inline new-item input at top of tree */}
        {newItemType && (
          <NewItemInput
            type={newItemType}
            onCommit={handleNewItem}
            onCancel={() => setNewItemType(null)}
          />
        )}

        {treeChildren.length === 0 && !newItemType ? (
          <div className="px-4 py-8 text-center">
            <p className="text-zinc-600 text-xs mb-3">Sin carpeta abierta</p>
            <button
              onClick={handleOpenFolder}
              className="text-xs text-emerald-600 hover:text-emerald-400
                         underline underline-offset-2 transition-colors"
            >
              Abrir carpeta
            </button>
          </div>
        ) : (
          treeChildren.map((entry) => (
            <ConnectedFileItem
              key={entry.path}
              entry={entry}
              depth={0}
              onRefresh={refresh}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Small icon button ────────────────────────────────────────────────────────

function ActionButton({
  title,
  onClick,
  icon,
}: {
  title: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded text-zinc-500 hover:text-zinc-200
                 hover:bg-zinc-800 transition-colors"
    >
      {icon}
    </button>
  );
}
