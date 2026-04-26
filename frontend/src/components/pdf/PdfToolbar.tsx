import { useAppStore } from "../../store/useAppStore";

interface PdfToolbarProps {
  currentPage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  scale: number | "auto";
  computedScale: number;
  onScaleChange: (scale: number | "auto") => void;
  pdfPath: string | null;
}

export function PdfToolbar({
  currentPage,
  pageCount,
  onPageChange,
  scale,
  computedScale,
  onScaleChange,
  pdfPath,
}: PdfToolbarProps) {
  const { compileStatus, pdfViewerMode, setPdfViewerMode } = useAppStore();

  if (!pdfPath) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-900 shrink-0 select-none">
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider hidden sm:inline">
          Reader
        </span>
        <div className="flex bg-zinc-800 rounded p-0.5 border border-zinc-700">
          <button
            onClick={() => setPdfViewerMode("localleaf")}
            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
              pdfViewerMode === "localleaf"
                ? "bg-zinc-700 text-emerald-400 shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            title="LocalLeaf Custom Reader"
          >
            Local
          </button>
          <button
            onClick={() => setPdfViewerMode("browser")}
            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
              pdfViewerMode === "browser"
                ? "bg-zinc-700 text-blue-400 shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            title="Native Browser Reader"
          >
            Browser
          </button>
        </div>
        
        <span className="text-xs text-zinc-500 truncate ml-2">
          {compileStatus === "compiling" && (
            <span className="text-emerald-400 animate-pulse">Compilando…</span>
          )}
          {compileStatus === "success" && pageCount > 0 && (
            <span className="text-zinc-400">
              {currentPage} / {pageCount}
            </span>
          )}
        </span>
      </div>

      {/* Page navigation */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800
                     disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
          disabled={currentPage >= pageCount}
          className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800
                     disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div className="w-px h-4 bg-zinc-800 mx-1" />

      {/* Zoom */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onScaleChange(Math.max(0.5, (scale === "auto" ? computedScale : scale) - 0.2))}
          className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        
        <button 
          className="px-2 py-0.5 rounded text-[10px] font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors min-w-[50px] text-center" 
          onClick={() => onScaleChange("auto")}
          title="Ajustar a la ventana"
        >
          {Math.round(computedScale * 100)}%
        </button>

        <button
          onClick={() => onScaleChange(Math.min(5, (scale === "auto" ? computedScale : scale) + 0.2))}
          className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
