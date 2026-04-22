import { useAppStore, type SidebarTab } from "../../store/useAppStore";

interface Tab {
  id: SidebarTab;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  {
    id: "files",
    label: "Archivos",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M3 6h18M3 12h18M3 18h18" />
      </svg>
    ),
  },
  {
    id: "search",
    label: "Buscar",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    id: "logs",
    label: "Compilación",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M4 17l6-6-6-6" />
        <path d="M12 19h8" />
      </svg>
    ),
  },
];

export function SidebarToolbar() {
  const { sidebarTab, setSidebarTab } = useAppStore();

  return (
    <div className="flex flex-col w-10 shrink-0 bg-zinc-900 border-r border-zinc-800 py-1">
      {TABS.map((tab) => {
        const active = sidebarTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setSidebarTab(tab.id)}
            title={tab.label}
            className={`
              relative flex items-center justify-center w-10 h-10
              transition-colors
              ${active
                ? "text-emerald-400"
                : "text-zinc-600 hover:text-zinc-300"
              }
            `}
          >
            {active && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-emerald-500 rounded-r" />
            )}
            {tab.icon}
          </button>
        );
      })}
    </div>
  );
}
