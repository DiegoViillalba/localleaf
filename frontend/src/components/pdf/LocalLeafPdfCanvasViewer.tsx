import { useEffect, useRef, useState, useMemo } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { useAppStore } from "../../store/useAppStore";

interface LocalLeafPdfCanvasViewerProps {
  pdf: pdfjsLib.PDFDocumentProxy | null;
  currentPage: number;
  scale: number | "auto";
  onScaleComputed: (scale: number) => void;
}

export function LocalLeafPdfCanvasViewer({
  pdf,
  currentPage,
  scale,
  onScaleComputed,
}: LocalLeafPdfCanvasViewerProps) {
  const { pdfRenderQuality } = useAppStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Monitor container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Determine DPR based on quality setting
  const pixelRatio = useMemo(() => {
    const dpr = window.devicePixelRatio || 1;
    if (pdfRenderQuality === "low") return 1;
    if (pdfRenderQuality === "balanced") return Math.min(dpr, 1.5);
    if (pdfRenderQuality === "high") return Math.min(dpr, 2.5);
    return Math.min(dpr, 1.5);
  }, [pdfRenderQuality]);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;

    let cancelled = false;

    const renderPage = async () => {
      try {
        // 1. Cancel previous task
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await pdf.getPage(currentPage);
        if (cancelled) return;

        // 2. Compute scale
        let currentScale = typeof scale === "number" ? scale : 1.0;
        if (scale === "auto" && containerSize.width > 0) {
          const unscaledViewport = page.getViewport({ scale: 1 });
          const padding = 48;
          const widthScale = (containerSize.width - padding) / unscaledViewport.width;
          const heightScale = (containerSize.height - padding) / unscaledViewport.height;
          currentScale = Math.min(widthScale, heightScale);
        }
        
        onScaleComputed(currentScale);

        // 3. Prepare canvas
        const canvas = canvasRef.current!;
        const viewport = page.getViewport({ scale: currentScale });
        
        const outputWidth = Math.floor(viewport.width * pixelRatio);
        const outputHeight = Math.floor(viewport.height * pixelRatio);

        // Clear and resize canvas
        const ctx = canvas.getContext("2d", { alpha: false });
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        canvas.width = outputWidth;
        canvas.height = outputHeight;
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        if (!ctx) return;

        // 4. Render
        const transform = pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : undefined;
        const renderTask = page.render({
          canvasContext: ctx,
          viewport,
          transform,
          intent: "display",
        });
        
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        
        // 5. Cleanup page resources
        page.cleanup();
      } catch (err: any) {
        if (!cancelled && err.name !== "RenderingCancelledException") {
          console.error("LocalLeaf PDF Render Error:", err);
        }
      }
    };

    renderPage();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdf, currentPage, scale, containerSize, pixelRatio, onScaleComputed]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto flex items-start justify-center p-4 bg-[#1a1a1a]"
    >
      <canvas
        ref={canvasRef}
        className="shadow-2xl transition-opacity duration-200"
        style={{ display: pdf ? "block" : "none" }}
      />
    </div>
  );
}
