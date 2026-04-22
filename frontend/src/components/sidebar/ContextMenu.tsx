import { useEffect, useRef, useState } from "react";
import { deleteEntry, renameEntry } from "../../lib/tauri";
import { useAppStore } from "../../store/useAppStore";
import type { FileEntry } from "../../types";

interface ContextMenuProps {
  entry: FileEntry;
  x: number;
  y: number;
  onClose: () => void;
  onStartRename: () => void;
  onRefresh: () => Promise<void>;
}

type Phase = "menu" | "confirm-delete";

export function ContextMenu({
  entry,
  x,
  y,
  onClose,
  onStartRename,
  onRefresh,
}: ContextMenuProps) {
  const { activeFilePath, rootFilePath, setRootFilePath, closeFile } =
    useAppStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("menu");
  const [pos, setPos] = useState({ x, y });

  // Smart positioning — keep inside viewport
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPos({
      x: Math.min(x, window.innerWidth - width - 8),
      y: Math.min(y, window.innerHeight - height - 8),
    });
  }, [x, y]);

  // Close on outside click or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const handleDelete = async () => {
    try {
      if (activeFilePath === entry.path) closeFile(entry.path);
      if (rootFilePath === entry.path) setRootFilePath(null);
      await deleteEntry(entry.path);
      await onRefresh();
    } catch (err) {
      console.error("Error al eliminar:", err);
    } finally {
      onClose();
    }
  };

  const isTex = entry.extension === "tex";
  const isRoot = rootFilePath === entry.path;

  const sep = (
    <div className="my-1 border-t border-zinc-700/60" />
  );

  const Item = ({
    label,
    onClick,
    danger = false,
    disabled = false,
  }: {
    label: string;
    onClick: () => void;
    danger?: boolean;
    disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full text-left px-3 py-1.5 text-xs rounded transition-colors
        ${danger
          ? "text-red-400 hover:bg-red-900/30"
          : "text-zinc-300 hover:bg-zinc-700"
        }
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {label}
    </button>
  );

  return (
    <div
      ref={menuRef}
      style={{ left: pos.x, top: pos.y }}
      className="fixed z-50 min-w-[168px] bg-zinc-800 border border-zinc-700
                 rounded-lg shadow-2xl py-1 text-xs"
      onContextMenu={(e) => e.preventDefault()}
    >
      {phase === "menu" ? (
        <>
          {isTex && !entry.is_dir && (
            <>
              <Item
                label={isRoot ? "⊙  Raíz de compilación" : "⊙  Usar como raíz"}
                onClick={() => { setRootFilePath(entry.path); onClose(); }}
                disabled={isRoot}
              />
              {sep}
            </>
          )}

          <Item label="Renombrar" onClick={() => { onClose(); onStartRename(); }} />
          {sep}
          <Item label="Eliminar" danger onClick={() => setPhase("confirm-delete")} />
        </>
      ) : (
        <div className="px-3 py-2 flex flex-col gap-2">
          <p className="text-zinc-400 text-xs leading-tight">
            ¿Eliminar <span className="text-zinc-200 font-medium">"{entry.name}"</span>?
            {entry.is_dir && (
              <span className="block text-zinc-500 mt-0.5">Se borrará todo su contenido.</span>
            )}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              className="flex-1 py-1 rounded text-xs font-medium
                         bg-red-900/60 text-red-300 hover:bg-red-800/80 transition-colors"
            >
              Eliminar
            </button>
            <button
              onClick={() => setPhase("menu")}
              className="flex-1 py-1 rounded text-xs text-zinc-400
                         bg-zinc-700 hover:bg-zinc-600 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
