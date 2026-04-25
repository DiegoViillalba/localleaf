import { useEffect, useRef } from "react";
import { MergeView } from "@codemirror/merge";
import { EditorState } from "@codemirror/state";
import { EditorView, basicSetup } from "codemirror";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { StreamLanguage } from "@codemirror/language";
import { oneDark } from "@codemirror/theme-one-dark";

interface DiffViewerProps {
  original: string;
  modified: string;
  onClose: () => void;
}

export function DiffViewer({ original, modified, onClose }: DiffViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const mergeView = new MergeView({
      a: {
        doc: original,
        extensions: [basicSetup, StreamLanguage.define(stex), oneDark, EditorView.editable.of(false), EditorState.readOnly.of(true)],
      },
      b: {
        doc: modified,
        extensions: [basicSetup, StreamLanguage.define(stex), oneDark, EditorView.editable.of(false), EditorState.readOnly.of(true)],
      },
      parent: containerRef.current,
      orientation: "a-b", // Side by side
      gutter: true,
      collapseUnchanged: { margin: 3, minSize: 4 }
    });

    return () => {
      mergeView.destroy();
    };
  }, [original, modified]);

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800">
      <div className="flex items-center justify-between p-2 border-b border-zinc-800 bg-zinc-800/50">
        <h3 className="text-xs font-semibold text-zinc-300">Visor de Diferencias</h3>
        <button 
          onClick={onClose}
          className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs text-zinc-200 transition-colors"
        >
          Cerrar
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-zinc-950" ref={containerRef} />
    </div>
  );
}
