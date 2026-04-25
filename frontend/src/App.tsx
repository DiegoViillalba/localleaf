import { useEffect, useRef } from "react";
import { Group, Panel, PanelImperativeHandle, PanelSize } from "react-resizable-panels";
import { checkTectonic, onTectonicMissing, scanProject, openFolderDialog } from "./lib/tauri";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useAppStore } from "./store/useAppStore";
import { useAutoSave } from "./hooks/useAutoSave";
import { useAutoCommit } from "./hooks/useAutoCommit";
import { useCompile } from "./hooks/useCompile";
import { Sidebar } from "./components/sidebar/Sidebar";
import { LatexEditor } from "./components/editor/LatexEditor";
import { PdfViewer } from "./components/pdf/PdfViewer";
import { ErrorPanel } from "./components/ui/ErrorPanel";
import { StatusBar } from "./components/ui/StatusBar";
import { TectonicBanner } from "./components/ui/TectonicBanner";
import { ResizeHandle } from "./components/ui/ResizeHandle";
import { SettingsModal } from "./components/settings/SettingsModal";
import { DiffViewer } from "./components/editor/DiffViewer";
import { detectRoot } from "./components/sidebar/panels/FileTreePanel";
import { applyCustomTheme, removeCustomTheme } from "./lib/theme";

export default function App() {
  const { setTectonicAvailable, layout, setLayout, diffViewer, setDiffViewer, workspaceDir, setWorkspace, appTheme, customThemeColor } = useAppStore();
  const { compile } = useCompile();
  const sidebarRef = useRef<PanelImperativeHandle>(null);
  const pdfRef = useRef<PanelImperativeHandle>(null);

  // Theme Management
  useEffect(() => {
    document.body.className = `theme-${appTheme}`;
    
    if (appTheme === "custom") {
      applyCustomTheme(customThemeColor);
    } else {
      removeCustomTheme();
    }
  }, [appTheme, customThemeColor]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdS = e.metaKey && e.key.toLowerCase() === "s" && !e.shiftKey;
      const isCtrlG = e.ctrlKey && e.key.toLowerCase() === "g";
      const isCmdShiftN = e.metaKey && e.shiftKey && e.key.toLowerCase() === "n";
      const isCtrlShiftN = e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "n";
      
      if (isCmdS || isCtrlG) {
        e.preventDefault();
        compile();
      }

      if (isCmdShiftN || isCtrlShiftN) {
        e.preventDefault();
        openFolderDialog().then((dir) => {
          if (dir) {
            invoke("open_project_window", { projectPath: dir }).catch(console.error);
          }
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [compile]);

  // Read URL project parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectPath = params.get("project");
    if (projectPath) {
      scanProject(projectPath).then(tree => {
        const root = detectRoot(tree);
        setWorkspace(projectPath, tree, root);
      }).catch(console.error);
    }
  }, [setWorkspace]);

  // Update window title based on workspace
  useEffect(() => {
    const windowTitle = workspaceDir ? `${workspaceDir.split("/").pop()} - LocalLeaf` : "LocalLeaf";
    getCurrentWebviewWindow().setTitle(windowTitle).catch(console.error);
  }, [workspaceDir]);

  // Sync state -> Panel layout
  useEffect(() => {
    if (layout.isSidebarCollapsed) {
      sidebarRef.current?.collapse();
    } else {
      sidebarRef.current?.expand();
    }
  }, [layout.isSidebarCollapsed]);

  useEffect(() => {
    if (layout.isPdfCollapsed) {
      pdfRef.current?.collapse();
    } else {
      pdfRef.current?.expand();
    }
  }, [layout.isPdfCollapsed]);

  // Auto-save side-effect
  useAutoSave();
  useAutoCommit();

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

      {/* Resizable layout */}
      <Group orientation="horizontal" className="flex-1 overflow-hidden" id="localleaf-panel-group">
        {/* Sidebar */}
        <Panel 
          panelRef={sidebarRef}
          defaultSize={layout.sidebarWidth} 
          minSize={15} 
          collapsible={true}
          onResize={(size: PanelSize) => {
            if (size.asPercentage === 0) {
              setLayout({ isSidebarCollapsed: true });
            } else {
              setLayout({ isSidebarCollapsed: false, sidebarWidth: size.asPercentage });
            }
          }}
          className="shrink-0"
        >
          <Sidebar />
        </Panel>

        <ResizeHandle />

        {/* Editor or DiffViewer */}
        <Panel 
          defaultSize={layout.editorWidth}
          minSize={20}
          className="flex flex-col min-w-0 min-h-0 relative"
        >
          {diffViewer?.isOpen ? (
            <DiffViewer 
              original={diffViewer.original} 
              modified={diffViewer.modified} 
              onClose={() => setDiffViewer(null)} 
            />
          ) : (
            <LatexEditor className="flex-1 min-h-0" />
          )}
          <ErrorPanel />
        </Panel>

        <ResizeHandle />

        {/* PDF Viewer */}
        <Panel 
          panelRef={pdfRef}
          defaultSize={layout.pdfWidth}
          minSize={25}
          collapsible={true}
          onResize={(size: PanelSize) => {
            if (size.asPercentage === 0) {
              setLayout({ isPdfCollapsed: true });
            } else {
              setLayout({ isPdfCollapsed: false, pdfWidth: size.asPercentage });
            }
          }}
          className="shrink-0 bg-zinc-950 border-l border-zinc-800"
        >
          <PdfViewer />
        </Panel>
      </Group>

      <StatusBar />

      {/* Global Modals */}
      <SettingsModal />
    </div>
  );
}
