import { useEffect } from "react";
import { checkTectonic, onTectonicMissing } from "./lib/tauri";
import { useAppStore } from "./store/useAppStore";
import { useAutoSave } from "./hooks/useAutoSave";
import { Sidebar } from "./components/sidebar/Sidebar";
import { LatexEditor } from "./components/editor/LatexEditor";
import { PdfViewer } from "./components/pdf/PdfViewer";
import { ErrorPanel } from "./components/ui/ErrorPanel";
import { StatusBar } from "./components/ui/StatusBar";
import { TectonicBanner } from "./components/ui/TectonicBanner";

export default function App() {
  const setTectonicAvailable = useAppStore((s) => s.setTectonicAvailable);

  // Auto-save side-effect
  useAutoSave();

  // Check Tectonic on mount
  useEffect(() => {
    checkTectonic().then(setTectonicAvailable).catch(() => setTectonicAvailable(false));

    // Also listen for the event emitted during setup
    const unsub = onTectonicMissing(() => setTectonicAvailable(false));
    return () => { unsub.then((fn) => fn()); };
  }, [setTectonicAvailable]);

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-200 overflow-hidden font-sans">
      <TectonicBanner />

      {/* Three-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar – 220px fixed */}
        <div className="w-[220px] shrink-0">
          <Sidebar />
        </div>

        {/* Editor – flexible */}
        <div className="flex flex-col flex-1 border-r border-zinc-800 min-w-0">
          <LatexEditor className="flex-1" />
          <ErrorPanel />
        </div>

        {/* PDF Viewer – 45% */}
        <div className="w-[45%] shrink-0">
          <PdfViewer />
        </div>
      </div>

      <StatusBar />
    </div>
  );
}
