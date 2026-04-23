import { useCallback, useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { StreamLanguage } from "@codemirror/language";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";
import { useAppStore } from "../../store/useAppStore";
import { useCompile } from "../../hooks/useCompile";
import { useAiAssist } from "../../hooks/useAiAssist";

interface EditorProps {
  className?: string;
}

export function LatexEditor({ className = "" }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const { content, setContent, activeFilePath, rootFilePath, compileStatus } = useAppStore();
  const { compile } = useCompile();
  const { assist, aiStatus } = useAiAssist();

  // Build the editor on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const startState = EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        StreamLanguage.define(stex),
        oneDark,
        keymap.of([
          indentWithTab,
          // Ctrl/Cmd+S → save + compile
          {
            key: "Mod-s",
            run: () => {
              compile();
              return true;
            },
          },
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            setContent(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          "&": { height: "100%", fontSize: "14px", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" },
          ".cm-scroller": { overflow: "auto" },
          ".cm-content": { padding: "12px 0" },
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When a new file is opened, replace editor content
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== content) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: content },
      });
    }
  }, [activeFilePath]); // intentionally only on file change, not every keystroke

  const handleAiAssist = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const selection = view.state.sliceDoc(from, to);
    if (!selection.trim()) {
      alert("Selecciona texto en el editor antes de usar AI Assist.");
      return;
    }
    assist(selection);
  }, [assist]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-950">
        <span className="text-xs text-zinc-500 flex-1 truncate flex items-center gap-2 min-w-0">
          <span className="truncate">
            {activeFilePath
              ? activeFilePath.split("/").pop()
              : "Sin archivo abierto"}
          </span>
          {rootFilePath && rootFilePath !== activeFilePath && (
            <span className="shrink-0 text-[10px] text-zinc-600 border border-zinc-700 rounded px-1.5 py-0.5">
              compilando: {rootFilePath.split("/").pop()}
            </span>
          )}
        </span>
        <button
          onClick={handleAiAssist}
          disabled={aiStatus === "streaming" || !activeFilePath}
          className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium
                     bg-emerald-900/40 text-emerald-400 border border-emerald-800
                     hover:bg-emerald-800/60 disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors"
        >
          {aiStatus === "streaming" ? (
            <>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Generando…
            </>
          ) : (
            <>✦ AI Assist</>
          )}
        </button>
        <button
          onClick={compile}
          disabled={!activeFilePath || compileStatus === "compiling"}
          className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium
                     bg-zinc-800 text-zinc-300 border border-zinc-700
                     hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors"
        >
          {compileStatus === "compiling" ? (
            <>
              <span className="inline-block w-2 h-2 rounded-full bg-zinc-400 animate-pulse" />
              Compilando...
            </>
          ) : (
            <>⌘S Compilar</>
          )}
        </button>
      </div>

      {/* CodeMirror */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
        style={{ minHeight: 0 }}
      />

      {/* No file placeholder */}
      {!activeFilePath && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-zinc-600 text-sm">
            Abre un archivo .tex para empezar
          </p>
        </div>
      )}
    </div>
  );
}
