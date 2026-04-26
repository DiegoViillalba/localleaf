interface BrowserPdfViewerProps {
  pdfUrl: string | null;
  currentPage: number;
  reloadKey?: string | null;
}

export function BrowserPdfViewer({ pdfUrl, currentPage, reloadKey }: BrowserPdfViewerProps) {
  if (!pdfUrl) return null;

  const urlWithPage = `${pdfUrl}#page=${currentPage}`;

  return (
    <div className="flex-1 bg-[#1a1a1a] overflow-hidden">
      <iframe
        key={reloadKey ?? pdfUrl}
        src={urlWithPage}
        className="w-full h-full border-none"
        title="PDF Browser Viewer"
      />
    </div>
  );
}
