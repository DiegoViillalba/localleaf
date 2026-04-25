import { useCallback, useEffect, useRef } from "react";
import { EditorView } from "codemirror";
import { EditorState, Compartment, StateEffect } from "@codemirror/state";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { StreamLanguage, foldGutter, indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldKeymap } from "@codemirror/language";
import { convertFileSrc } from "@tauri-apps/api/core";
import { autocompletion, acceptCompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import { linter, lintGutter, lintKeymap } from "@codemirror/lint";
import { keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from "@codemirror/view";
import { indentWithTab, toggleComment, history, defaultKeymap, historyKeymap } from "@codemirror/commands";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { oneDark } from "@codemirror/theme-one-dark";
import { useAppStore } from "../../store/useAppStore";
import { useCompile } from "../../hooks/useCompile";
import { useAiAssist } from "../../hooks/useAiAssist";
import { latexCompletions } from "./latexCompletions";
import { latexLinter } from "./latexLinter";

interface EditorProps {
  className?: string;
}

export function LatexEditor({ className = "" }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const configCompartment = useRef(new Compartment());
  const { content, setContent, activeFilePath, rootFilePath, compileStatus, editorJumpLine, setEditorJumpLine, editorConfig } = useAppStore();
  const { compile, cancel } = useCompile();
  const { assist, aiStatus } = useAiAssist();

  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const compileShortcut = isMac ? "⌘S" : "Ctrl+S";

  const isImage = activeFilePath ? /\.(png|jpe?g|gif|webp|svg)$/i.test(activeFilePath) : false;
  const isPdf = activeFilePath ? /\.pdf$/i.test(activeFilePath) : false;

  const getConfigExtensions = useCallback((cfg: typeof editorConfig) => {
    const exts = [];
    if (cfg.lineNumbers) {
      exts.push(lineNumbers(), highlightActiveLineGutter());
    }
    if (cfg.codeFolding) {
      exts.push(foldGutter());
    }
    if (cfg.highlightActiveLine) {
      exts.push(highlightActiveLine());
    }
    if (cfg.matchBrackets) {
      exts.push(bracketMatching(), closeBrackets());
    }
    if (cfg.autoComplete) {
      exts.push(autocompletion({ override: [latexCompletions] }));
    }
    if (cfg.wordWrap) {
      exts.push(EditorView.lineWrapping);
    }
    exts.push(EditorView.contentAttributes.of({ spellcheck: cfg.spellCheck ? "true" : "false" }));
    return exts;
  }, []);

  // Build the editor on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const startState = EditorState.create({
      doc: content,
      extensions: [
        // Base Setup (Static)
        highlightSpecialChars(),
        history(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        rectangularSelection(),
        crosshairCursor(),
        highlightSelectionMatches(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          ...lintKeymap
        ]),

        // Dynamic Config via Compartment
        configCompartment.current.of(getConfigExtensions(editorConfig)),

        StreamLanguage.define(stex),
        linter(latexLinter),
        lintGutter(),
        oneDark,
        keymap.of([
          { key: "Tab", run: acceptCompletion },
          indentWithTab,
          // Ctrl/Cmd+S → save + compile
          {
            key: "Mod-s",
            run: () => {
              compile();
              return true;
            },
          },
          // Ctrl+G → save + compile (Windows requested shortcut)
          {
            key: "Ctrl-g",
            run: () => {
              compile();
              return true;
            },
          },
          // Toggle Comment
          {
            key: "Mod-/",
            run: toggleComment,
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

  // Update editor configuration when settings change
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: configCompartment.current.reconfigure(getConfigExtensions(editorConfig))
    });
  }, [editorConfig, getConfigExtensions]);

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

  // Handle jump to line from Outline
  useEffect(() => {
    if (editorJumpLine === null) return;
    const view = viewRef.current;
    if (!view) return;

    // Convert 1-indexed line to CodeMirror position
    const doc = view.state.doc;
    const lineNum = Math.min(Math.max(1, editorJumpLine), doc.lines);
    const line = doc.line(lineNum);
    
    view.dispatch({
      selection: { anchor: line.from, head: line.from },
      effects: EditorView.scrollIntoView(line.from, { y: "center" }),
    });

    // Reset so clicking the same item again works
    setEditorJumpLine(null);
  }, [editorJumpLine, setEditorJumpLine]);

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
    <div className={`flex flex-col h-full overflow-hidden ${className}`}>
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
        <div className="flex items-center gap-1">
          {compileStatus === "compiling" && (
            <button
              onClick={cancel}
              title="Detener compilación"
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium
                         bg-red-900/40 text-red-400 border border-red-800
                         hover:bg-red-800/60 transition-colors"
            >
              ✕ Detener
            </button>
          )}
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
              <>{compileShortcut} Compilar</>
            )}
          </button>
        </div>
      </div>

      {/* CodeMirror */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-hidden relative ${isImage || isPdf || !activeFilePath ? "hidden" : "block"}`}
        style={{ minHeight: 0 }}
      />

      {/* Image Preview */}
      {isImage && activeFilePath && (
        <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-zinc-900/30">
          <img 
            src={convertFileSrc(activeFilePath)} 
            alt="Vista previa" 
            className="max-w-full max-h-full object-contain drop-shadow-md rounded" 
          />
        </div>
      )}

      {/* PDF Preview */}
      {isPdf && activeFilePath && (
        <div className="flex-1 w-full h-full bg-zinc-900/30">
          <iframe 
            src={convertFileSrc(activeFilePath)} 
            className="w-full h-full border-none"
            title="PDF Preview"
          />
        </div>
      )}

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
