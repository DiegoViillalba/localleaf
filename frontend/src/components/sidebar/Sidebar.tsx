import { useAppStore } from "../../store/useAppStore";
import { SidebarToolbar } from "./SidebarToolbar";
import { FileTreePanel } from "./panels/FileTreePanel";
import { SearchPanel } from "./panels/SearchPanel";
import { LogsPanel } from "./panels/LogsPanel";

export function Sidebar() {
  const sidebarTab = useAppStore((s) => s.sidebarTab);

  return (
    <div className="flex h-full">
      <SidebarToolbar />

      {/* Active panel */}
      <div className="flex-1 min-w-0 border-r border-zinc-800 overflow-hidden">
        {sidebarTab === "files"  && <FileTreePanel />}
        {sidebarTab === "search" && <SearchPanel />}
        {sidebarTab === "logs"   && <LogsPanel />}
      </div>
    </div>
  );
}
