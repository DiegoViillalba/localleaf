import { useEffect, useState } from "react";

interface BrowserPdfViewerProps {
  pdfUrl: string | null;
  currentPage: number;
}

export function BrowserPdfViewer({ pdfUrl, currentPage }: BrowserPdfViewerProps) {
  const [key, setKey] = useState(0);

  // We use a key to force iframe reload when the page changes if the viewer doesn't support fragment navigation updates
  // However, for performance, we only reload if the URL significantly changes or if we want to force the #page anchor.
  useEffect(() => {
    // If the browser supports it, changing the src with #page=X should jump to that page.
    // Some browsers require a full reload to respect the new #page.
  }, [currentPage]);

  if (!pdfUrl) return null;

  // Append fragment to URL
  const urlWithPage = `${pdfUrl}#page=${currentPage}`;

  return (
    <div className="flex-1 bg-[#1a1a1a] overflow-hidden">
      <iframe
        key={pdfUrl} // Only reload iframe when the PDF file changes
        src={urlWithPage}
        className="w-full h-full border-none"
        title="PDF Browser Viewer"
      />
    </div>
  );
}
