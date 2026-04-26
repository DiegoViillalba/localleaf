import { useEffect, useRef, useState, useMemo } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { convertFileSrc } from "@tauri-apps/api/core";
import { readFileBytes } from "../../lib/tauri";
import { useAppStore } from "../../store/useAppStore";
import { PdfToolbar } from "./PdfToolbar";
import { LocalLeafPdfCanvasViewer } from "./LocalLeafPdfCanvasViewer";
import { BrowserPdfViewer } from "./BrowserPdfViewer";

// Setup pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

export function PdfViewer() {
  const { 
    pdfPath, 
    pdfViewerMode,
    pdfCurrentPageByPath,
    setPdfCurrentPage,
    pdfScaleByPath,
    setPdfScale,
  } = useAppStore();

  const [pageCount, setPageCount] = useState(0);
  const [computedScale, setComputedScale] = useState(1.0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const docRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  // Clean path for store keys
  const cleanPath = useMemo(() => pdfPath?.split("?")[0] || null, [pdfPath]);
  
  // Get persisted state for this PDF
  const currentPage = (cleanPath && pdfCurrentPageByPath[cleanPath]) || 1;
  const scale = (cleanPath && pdfScaleByPath[cleanPath]) || "auto";

  // PDF URL for browser mode (convertFileSrc) — derived from clean path, no timestamp
  const pdfUrl = useMemo(() => cleanPath ? convertFileSrc(cleanPath) : null, [cleanPath]);

  // URL used to load the PDF in pdf.js — includes timestamp to bust Tauri's asset cache on recompile
  const pdfLoadUrl = useMemo(() => {
    if (!cleanPath) return null;
    const baseUrl = convertFileSrc(cleanPath);
    const qs = pdfPath?.includes("?") ? pdfPath.split("?")[1] : null;
    return qs ? `${baseUrl}?${qs}` : baseUrl;
  }, [pdfPath, cleanPath]);

  // Load PDF for LocalLeaf mode (Canvas)
  useEffect(() => {
    if (!cleanPath || !pdfLoadUrl) return;

    let cancelled = false;

    const loadPdf = async () => {
      setLoadError(null);
      try {
        let pdf: pdfjsLib.PDFDocumentProxy;

        try {
          const loadingTask = pdfjsLib.getDocument(pdfLoadUrl);
          pdf = await loadingTask.promise;
        } catch (urlErr) {
          // Fallback to reading bytes (more RAM intensive but reliable)
          const bytes = await readFileBytes(cleanPath);
          const data = new Uint8Array(bytes);
          const loadingTask = pdfjsLib.getDocument({ data });
          pdf = await loadingTask.promise;
        }

        if (cancelled) {
          pdf.destroy();
          return;
        }

        if (docRef.current) {
          docRef.current.destroy();
        }

        docRef.current = pdf;
        setPageCount(pdf.numPages);

        // Ensure current page is valid for new document
        if (currentPage > pdf.numPages) {
          setPdfCurrentPage(cleanPath, pdf.numPages);
        }
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
        docRef.current = null;
      }
    };
  }, [pdfLoadUrl]);

  const isEmpty = !pdfPath;

  const handlePageChange = (page: number) => {
    if (cleanPath) {
      setPdfCurrentPage(cleanPath, page);
    }
  };

  const handleScaleChange = (newScale: number | "auto") => {
    if (cleanPath) {
      setPdfScale(cleanPath, newScale);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
      <PdfToolbar
        currentPage={currentPage}
        pageCount={pageCount}
        onPageChange={handlePageChange}
        scale={scale}
        computedScale={computedScale}
        onScaleChange={handleScaleChange}
        pdfPath={pdfPath}
      />

      <div className="flex-1 relative flex flex-col overflow-hidden">
        {isEmpty ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-600 bg-[#1a1a1a]">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p className="text-sm">Compila para ver el PDF</p>
          </div>
        ) : loadError ? (
           <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4 text-center bg-[#1a1a1a]">
             <span className="text-red-400 text-sm font-medium">Error al cargar PDF</span>
             <p className="text-zinc-500 text-xs max-w-xs break-words">{loadError}</p>
             <button 
               onClick={() => window.location.reload()}
               className="mt-2 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded"
             >
               Reintentar
             </button>
           </div>
        ) : (
          <>
            {pdfViewerMode === "localleaf" ? (
              <LocalLeafPdfCanvasViewer
                pdf={docRef.current}
                currentPage={currentPage}
                scale={scale}
                onScaleComputed={setComputedScale}
              />
            ) : (
              <BrowserPdfViewer
                pdfUrl={pdfUrl}
                currentPage={currentPage}
                reloadKey={pdfPath}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
