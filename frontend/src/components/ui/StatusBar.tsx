import { useAppStore } from "../../store/useAppStore";
import { AiPanel } from "../ai/AiPanel";

export function StatusBar() {
  const { activeFilePath, isDirty, compileStatus, tectonicAvailable, layout, setLayout } = useAppStore();

  const statusIndicator = () => {
    if (!tectonicAvailable)
      return <span className="text-red-500">⚠ Tectonic no encontrado</span>;
    if (compileStatus === "compiling")
      return <span className="text-emerald-400 animate-pulse">Compilando</span>;
    if (compileStatus === "success")
      return <span className="text-emerald-600">OK</span>;
    if (compileStatus === "error")
      return <span className="text-red-400">Error</span>;
    return null;
  };

  return (
    <div className="relative flex items-center gap-3 px-3 h-7 bg-zinc-950 border-t border-zinc-800 text-xs text-zinc-500 shrink-0">
      <button 
        onClick={() => setLayout({ isSidebarCollapsed: !layout.isSidebarCollapsed })}
        className="hover:text-zinc-300 transition-colors"
        title="Toggle Sidebar"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
      </button>

      {activeFilePath && (
        <span className="truncate max-w-xs">{activeFilePath}</span>
      )}
      {isDirty && <span className="text-yellow-600">●</span>}
      <div className="flex-1" />
      {statusIndicator()}
      <AiPanel />
      <span className="text-zinc-700">LocalLeaf 0.1</span>
      
      <button 
        onClick={() => setLayout({ isPdfCollapsed: !layout.isPdfCollapsed })}
        className="hover:text-zinc-300 transition-colors ml-1"
        title="Toggle PDF Viewer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="15" y1="3" x2="15" y2="21" />
        </svg>
      </button>
    </div>
  );
}
