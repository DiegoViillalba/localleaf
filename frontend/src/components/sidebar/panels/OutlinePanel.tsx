import { useMemo } from "react";
import { useAppStore } from "../../../store/useAppStore";

interface OutlineItem {
  id: string;
  level: number;
  label: string;
  line: number;
}

const levels: Record<string, number> = {
  section: 1,
  subsection: 2,
  subsubsection: 3,
  paragraph: 4,
  subparagraph: 5,
};

export function OutlinePanel() {
  const { content, setEditorJumpLine, activeFilePath } = useAppStore();

  const outline = useMemo(() => {
    if (!content) return [];
    
    const items: OutlineItem[] = [];
    const lines = content.split("\n");
    
    // Match structure commands: \section*{title}, \subsection[short]{title}, etc.
    const regex = /\\(section|subsection|subsubsection|paragraph|subparagraph)\*?(?:\[[^\]]*\])?\{([^}]+)\}/;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(regex);
      if (match) {
        const type = match[1];
        const label = match[2];
        items.push({
          id: `${i}-${type}`,
          level: levels[type],
          label,
          line: i + 1, // 1-indexed for the editor
        });
      }
    }
    
    return items;
  }, [content]);

  if (!activeFilePath) {
    return (
      <div className="flex flex-col h-full bg-zinc-950">
        <div className="p-3 border-b border-zinc-800 shrink-0">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Esquema
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-zinc-600 text-center">
            Abre un archivo para ver su estructura
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <div className="p-3 border-b border-zinc-800 shrink-0">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Esquema
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {outline.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-zinc-500">
              No se encontraron secciones en este documento.
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {outline.map((item) => (
              <li
                key={item.id}
                className="group"
                style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
              >
                <button
                  onClick={() => setEditorJumpLine(item.line)}
                  className="w-full text-left flex items-center gap-2 px-2 py-1 rounded 
                             text-sm text-zinc-400 hover:text-emerald-400 hover:bg-zinc-900/50
                             transition-colors"
                >
                  <span className="shrink-0 text-zinc-600 group-hover:text-emerald-500/50">
                    {item.level === 1 && "§"}
                    {item.level === 2 && "•"}
                    {item.level === 3 && "◦"}
                    {item.level === 4 && "▪"}
                    {item.level === 5 && "▫"}
                  </span>
                  <span className="truncate">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
