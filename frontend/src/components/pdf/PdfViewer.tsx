import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { readFileBytes } from "../../lib/tauri";
import { useAppStore } from "../../store/useAppStore";

// In production Tauri serves assets from tauri://localhost; in dev from localhost:5173.
// Vite transforms new URL(..., import.meta.url) to the correct hashed asset path in both cases.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

export function PdfViewer() {
  const { pdfPath, compileStatus } = useAppStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.4);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [docVersion, setDocVersion] = useState(0);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const docRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  // Load PDF as binary via Tauri command — works in dev and production without asset:// issues
  useEffect(() => {
    if (!pdfPath) return;

    let cancelled = false;

    const loadPdf = async () => {
      setLoadError(null);
      try {
        renderTaskRef.current?.cancel();

        const cleanPath = pdfPath.split("?")[0];
        const bytes = await readFileBytes(cleanPath);
        const data = new Uint8Array(bytes);

        const loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;

        if (cancelled) return;

        docRef.current = pdf;
        setPageCount(pdf.numPages);
        setCurrentPage(1);
        setDocVersion((v) => v + 1);
      } catch (err) {
        if (!cancelled) {
          console.error("Error cargando PDF:", err);
          setLoadError(String(err));
        }
      }
    };

    loadPdf();
    return () => { cancelled = true; };
  }, [pdfPath]);

  // Render the current page whenever page, scale or document changes
  useEffect(() => {
    const pdf = docRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas) return;

    let cancelled = false;

    const renderPage = async () => {
      try {
        renderTaskRef.current?.cancel();

        const page = await pdf.getPage(currentPage);
        const viewport = page.getViewport({ scale });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext("2d")!;
        const renderTask = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = renderTask;

        await renderTask.promise;
      } catch (err: unknown) {
        if (!cancelled && (err as { name?: string }).name !== "RenderingCancelledException") {
          console.error("Render error:", err);
        }
      }
    };

    renderPage();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [currentPage, scale, pageCount, docVersion]);

  const isEmpty = !pdfPath;

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 shrink-0">
        <span className="text-xs text-zinc-500 flex-1">
          {compileStatus === "compiling" && (
            <span className="text-emerald-400 animate-pulse">Compilando…</span>
          )}
          {compileStatus === "success" && pageCount > 0 && (
            <span className="text-zinc-400">
              Pág. {currentPage} / {pageCount}
            </span>
          )}
          {loadError && (
            <span className="text-red-400 text-xs truncate" title={loadError}>
              Error al cargar PDF
            </span>
          )}
        </span>

        {/* Page navigation */}
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage <= 1}
          className="px-2 py-0.5 rounded text-xs text-zinc-400 hover:text-zinc-200
                     disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ‹
        </button>
        <button
          onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
          disabled={currentPage >= pageCount}
          className="px-2 py-0.5 rounded text-xs text-zinc-400 hover:text-zinc-200
                     disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ›
        </button>

        {/* Zoom */}
        <button
          onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
          className="px-2 py-0.5 rounded text-xs text-zinc-400 hover:text-zinc-200"
        >
          −
        </button>
        <span className="text-xs text-zinc-500 w-10 text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale((s) => Math.min(3, s + 0.2))}
          className="px-2 py-0.5 rounded text-xs text-zinc-400 hover:text-zinc-200"
        >
          +
        </button>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex items-start justify-center p-4"
        style={{ background: "#1a1a1a" }}
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-600">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p className="text-sm">Compila para ver el PDF</p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="shadow-2xl"
            style={{ display: "block" }}
          />
        )}
      </div>
    </div>
  );
}
