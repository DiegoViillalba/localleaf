import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../../../store/useAppStore";
import type { GitCommit, GitStatusResult } from "../../../types";

export function VersionSidecar() {
  const { workspaceDir, gitConfig, activeFilePath, content, setDiffViewer } = useAppStore();
  
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [status, setStatus] = useState<GitStatusResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    if (!workspaceDir) return;
    setLoading(true);
    setError(null);
    try {
      // Ensure initialized
      await invoke("git_init", { workspace: workspaceDir });
      
      const st = await invoke<GitStatusResult>("git_status", { workspace: workspaceDir });
      setStatus(st);

      const logs = await invoke<GitCommit[]>("git_log", { workspace: workspaceDir });
      setCommits(logs);
    } catch (err) {
      console.error(err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [workspaceDir]);

  const handleSync = async () => {
    if (!workspaceDir || !gitConfig.repoUrl) return;
    setSyncing(true);
    setError(null);
    try {
      // Commit pending changes first before sync
      if (status?.has_changes) {
        await invoke("git_commit", { 
          workspace: workspaceDir, 
          message: "Auto-commit: Sincronización previa" 
        });
      }

      await invoke("git_pull", { 
        workspace: workspaceDir, 
        url: gitConfig.repoUrl, 
        pat: gitConfig.pat 
      });

      await invoke("git_push", { 
        workspace: workspaceDir, 
        url: gitConfig.repoUrl, 
        pat: gitConfig.pat 
      });
      
      await fetchHistory();
    } catch (err) {
      console.error(err);
      if (String(err) === "CONFLICT") {
        await fetchHistory(); // Will update status to show conflicts
      } else {
        setError(String(err));
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleResolveConflict = async (file: string, resolution: "ours" | "theirs") => {
    if (!workspaceDir) return;
    try {
      await invoke("git_resolve_conflict", { workspace: workspaceDir, filePath: file, resolution });
      await fetchHistory();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleRestore = async (commitHash: string) => {
    if (!workspaceDir || !activeFilePath) {
      setError("Abre un archivo para restaurar");
      return;
    }
    const relativePath = activeFilePath.replace(workspaceDir + "/", "");
    try {
      await invoke("git_restore_file", { 
        workspace: workspaceDir, 
        filePath: relativePath, 
        commitHash 
      });
      await fetchHistory();
      // Informing the user might be good here
    } catch(err) {
      setError(String(err));
    }
  };

  const handleViewDiff = async (commitHash: string) => {
    if (!workspaceDir || !activeFilePath) {
      setError("Abre un archivo para comparar");
      return;
    }
    const relativePath = activeFilePath.replace(workspaceDir + "/", "");
    try {
      const originalDoc = await invoke<string>("git_get_diff", {
        workspace: workspaceDir,
        filePath: relativePath,
        commitHash
      });
      setDiffViewer({
        isOpen: true,
        original: originalDoc,
        modified: content,
      });
    } catch(err) {
      setError(String(err));
    }
  };

  if (!workspaceDir) {
    return <div className="p-4 text-sm text-zinc-500">Abre un proyecto para ver versiones</div>;
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900 text-zinc-300">
      <div className="p-3 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm z-10 sticky top-0 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">
            Versiones
          </h2>
          <button 
            onClick={fetchHistory}
            className="text-zinc-400 hover:text-zinc-200"
            title="Actualizar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
        </div>

        {gitConfig.repoUrl ? (
          <button 
            onClick={handleSync}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-2 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 disabled:opacity-50 text-xs font-medium rounded transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 2v6h-6"></path>
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
              <path d="M3 22v-6h6"></path>
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
            </svg>
            {syncing ? "Sincronizando..." : "Sincronizar GitHub"}
          </button>
        ) : (
          <p className="text-[10px] text-zinc-500">Configura GitHub en Settings</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {error && (
          <div className="mb-4 p-2 bg-red-500/10 border border-red-500/20 rounded text-[10px] text-red-400">
            {error}
          </div>
        )}

        {status?.has_conflicts && status.conflicted_files.map(file => (
          <div key={file} className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <h3 className="text-xs font-bold text-amber-400 flex items-center gap-1">
              <span>⚠</span> Conflicto Detectado
            </h3>
            <p className="text-[10px] text-amber-300/80 mt-1 mb-2 truncate" title={file}>
              Archivo: {file}
            </p>
            <div className="flex gap-2">
              <button onClick={() => handleResolveConflict(file, "ours")} className="flex-1 py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 text-[10px] rounded transition-colors">
                Usar Local
              </button>
              <button onClick={() => handleResolveConflict(file, "theirs")} className="flex-1 py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 text-[10px] rounded transition-colors">
                Usar Remota
              </button>
            </div>
          </div>
        ))}

        {loading ? (
          <div className="text-xs text-zinc-500 text-center py-4">Cargando historial...</div>
        ) : (
          <div className="space-y-4">
            {commits.map((commit, i) => (
              <div key={commit.hash} className="relative pl-4">
                {/* Timeline connector */}
                {i !== commits.length - 1 && (
                  <div className="absolute left-[7px] top-4 bottom-[-16px] w-px bg-zinc-700" />
                )}
                {/* Timeline dot */}
                <div className="absolute left-1 top-1.5 w-3 h-3 rounded-full border-2 border-zinc-900 bg-emerald-500" />

                <div className="bg-zinc-800/40 border border-zinc-800 rounded-lg p-2.5 hover:bg-zinc-800 transition-colors group">
                  <div className="text-xs font-medium text-zinc-200 mb-1">{commit.message}</div>
                  <div className="flex justify-between items-center text-[10px] text-zinc-500">
                    <span>{new Date(commit.date).toLocaleString()}</span>
                    <span className="font-mono">{commit.hash.substring(0, 7)}</span>
                  </div>
                  
                  {/* Actions visible on hover */}
                  <div className="mt-2 hidden group-hover:flex gap-2">
                    <button 
                      onClick={() => handleViewDiff(commit.hash)}
                      className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-[10px] rounded transition-colors"
                      title="Ver diferencias con el archivo actual"
                    >
                      Diferencias
                    </button>
                    <button 
                      onClick={() => handleRestore(commit.hash)}
                      className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-[10px] rounded transition-colors"
                      title="Restaurar el archivo abierto a esta versión"
                    >
                      Restaurar
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {commits.length === 0 && (
              <p className="text-xs text-zinc-500 text-center">No hay versiones guardadas</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
