import { useCallback, useRef, useState } from "react";
import { createProject, listDirectory, openFolderDialog, readFile } from "../../lib/tauri";
import { useAppStore } from "../../store/useAppStore";
import type { FileEntry } from "../../types";

function FileIcon({ entry }: { entry: FileEntry }) {
  if (entry.is_dir) return <span className="text-zinc-500">▸</span>;
  if (entry.extension === "tex") return <span className="text-emerald-600">τ</span>;
  if (entry.extension === "pdf") return <span className="text-red-700">P</span>;
  return <span className="text-zinc-600">·</span>;
}

function FileItem({ entry }: { entry: FileEntry }) {
  const { activeFilePath, openFile, setFiles } = useAppStore();

  const handleClick = useCallback(async () => {
    if (entry.is_dir) {
      try {
        const children = await listDirectory(entry.path);
        setFiles(children);
      } catch (err) {
        console.error(err);
      }
      return;
    }

    if (entry.extension !== "tex") return;

    try {
      const content = await readFile(entry.path);
      openFile(entry.path, content);
    } catch (err) {
      console.error("Error al abrir archivo:", err);
    }
  }, [entry, openFile, setFiles]);

  const isActive = activeFilePath === entry.path;

  return (
    <button
      onClick={handleClick}
      className={`
        w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs rounded
        transition-colors truncate
        ${isActive
          ? "bg-emerald-900/30 text-emerald-300"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
        }
        ${entry.extension !== "tex" && !entry.is_dir ? "opacity-50 cursor-default" : "cursor-pointer"}
      `}
    >
      <FileIcon entry={entry} />
      <span className="truncate">{entry.name}</span>
    </button>
  );
}

export function Sidebar() {
  const { workspaceDir, files, setWorkspace, openFile } = useAppStore();
  const [showNewProject, setShowNewProject] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpenFolder = useCallback(async () => {
    const dir = await openFolderDialog();
    if (!dir) return;
    const entries = await listDirectory(dir);
    setWorkspace(dir, entries);
  }, [setWorkspace]);

  const handleShowNewProject = useCallback(() => {
    setCreateError(null);
    setProjectName("");
    setShowNewProject(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleCancelNewProject = useCallback(() => {
    setShowNewProject(false);
    setProjectName("");
    setCreateError(null);
  }, []);

  const handleCreateProject = useCallback(async () => {
    if (!workspaceDir || !projectName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const texPath = await createProject(workspaceDir, projectName.trim());
      const entries = await listDirectory(workspaceDir);
      setWorkspace(workspaceDir, entries);
      const content = await readFile(texPath);
      openFile(texPath, content);
      setShowNewProject(false);
      setProjectName("");
    } catch (err) {
      setCreateError(String(err));
    } finally {
      setCreating(false);
    }
  }, [workspaceDir, projectName, setWorkspace, openFile]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleCreateProject();
      if (e.key === "Escape") handleCancelNewProject();
    },
    [handleCreateProject, handleCancelNewProject]
  );

  const folderName = workspaceDir
    ? workspaceDir.split("/").pop() ?? workspaceDir
    : null;

  return (
    <aside className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800 select-none">
      {/* Header */}
      <div className="flex items-center gap-1 px-3 py-3 border-b border-zinc-800">
        <span className="text-emerald-500 font-semibold text-sm tracking-wide flex-1 truncate">
          {folderName ?? "LocalLeaf"}
        </span>

        {/* New project — only when workspace is open */}
        {workspaceDir && (
          <button
            onClick={handleShowNewProject}
            title="Nuevo proyecto"
            className="text-zinc-500 hover:text-zinc-200 transition-colors text-base leading-none px-0.5"
          >
            ✦
          </button>
        )}

        <button
          onClick={handleOpenFolder}
          title="Abrir carpeta"
          className="text-zinc-500 hover:text-zinc-200 transition-colors text-lg leading-none"
        >
          ⊕
        </button>
      </div>

      {/* New project input */}
      {showNewProject && (
        <div className="px-2 py-2 border-b border-zinc-800 flex flex-col gap-1.5">
          <span className="text-xs text-zinc-500 px-1">Nombre del proyecto</span>
          <div className="flex gap-1">
            <input
              ref={inputRef}
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="mi-proyecto"
              disabled={creating}
              className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded px-2 py-1
                         text-xs text-zinc-200 outline-none focus:border-emerald-600 transition-colors
                         disabled:opacity-50"
            />
            <button
              onClick={handleCreateProject}
              disabled={creating || !projectName.trim()}
              title="Crear"
              className="px-2 py-1 rounded bg-emerald-900/60 text-emerald-400 text-xs
                         hover:bg-emerald-800/80 disabled:opacity-40 disabled:cursor-not-allowed
                         transition-colors"
            >
              {creating ? "…" : "✓"}
            </button>
            <button
              onClick={handleCancelNewProject}
              disabled={creating}
              title="Cancelar"
              className="px-2 py-1 rounded text-zinc-500 text-xs hover:text-zinc-200
                         disabled:opacity-40 transition-colors"
            >
              ✕
            </button>
          </div>
          {createError && (
            <span className="text-xs text-red-400 px-1">{createError}</span>
          )}
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto py-1 px-1">
        {files.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-zinc-600 text-xs mb-2">Sin carpeta abierta</p>
            <button
              onClick={handleOpenFolder}
              className="text-xs text-emerald-600 hover:text-emerald-400 underline underline-offset-2"
            >
              Abrir carpeta
            </button>
          </div>
        ) : (
          files.map((f) => <FileItem key={f.path} entry={f} />)
        )}
      </div>
    </aside>
  );
}
