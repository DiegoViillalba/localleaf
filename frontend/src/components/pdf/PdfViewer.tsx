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
  const [scale, setScale] = useState<number | "auto">("auto");
  const [computedScale, setComputedScale] = useState(1.4);
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

        // Destroy previous document instance to avoid memory leaks
        if (docRef.current) {
          docRef.current.destroy();
        }

        docRef.current = pdf;
        setPageCount(pdf.numPages);
        setCurrentPage((prev) => Math.min(prev, pdf.numPages) || 1);
        setDocVersion((v) => v + 1);
      } catch (err) {
        if (!cancelled) {
          console.error("Error cargando PDF:", err);
          setLoadError(String(err));
        }
      }
    };

    loadPdf();
    return () => { 
      cancelled = true; 
      if (docRef.current) {
        docRef.current.destroy();
      }
    };
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
        
        let currentScale = typeof scale === "number" ? scale : 1.4;
        if (scale === "auto") {
          const unscaledViewport = page.getViewport({ scale: 1 });
          const container = containerRef.current;
          if (container) {
            const widthScale = (container.clientWidth - 48) / unscaledViewport.width;
            const heightScale = (container.clientHeight - 48) / unscaledViewport.height;
            currentScale = Math.min(widthScale, heightScale);
          }
        }

        if (cancelled) return;
        setComputedScale(currentScale);

        const viewport = page.getViewport({ scale: currentScale });
        const pixelRatio = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext("2d")!;
        const transform = pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : undefined;
        
        const renderTask = page.render({ 
          canvasContext: ctx, 
          transform: transform,
          viewport 
        });
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

  // Handle auto-resize
  useEffect(() => {
    if (scale !== "auto") return;
    const container = containerRef.current;
    if (!container) return;

    let timeoutId: number;
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setDocVersion((v) => v + 1);
      }, 150);
    });

    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
      clearTimeout(timeoutId);
    };
  }, [scale]);

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
          onClick={() => setScale((s) => Math.max(0.5, (s === "auto" ? computedScale : s) - 0.2))}
          className="px-2 py-0.5 rounded text-xs text-zinc-400 hover:text-zinc-200"
        >
          −
        </button>
        <span 
          className="text-xs text-zinc-500 w-12 text-center cursor-pointer hover:text-zinc-300" 
          onClick={() => setScale("auto")}
          title="Ajustar a la ventana"
        >
          {Math.round(computedScale * 100)}%
        </span>
        <button
          onClick={() => setScale((s) => Math.min(3, (s === "auto" ? computedScale : s) + 0.2))}
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
