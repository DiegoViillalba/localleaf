import { useState } from "react";
import { useAppStore } from "../../../store/useAppStore";
import type { LaTeXError } from "../../../types";

function kindIcon(kind: LaTeXError["kind"]) {
  if (kind === "error")   return <span className="text-red-400">✕</span>;
  if (kind === "warning") return <span className="text-yellow-400">△</span>;
  return                         <span className="text-zinc-500">·</span>;
}

function kindLabel(kind: LaTeXError["kind"]) {
  if (kind === "error")   return "text-red-400";
  if (kind === "warning") return "text-yellow-400";
  return "text-zinc-400";
}

export function LogsPanel() {
  const { compileResult, compileStatus, setPendingAiPrompt, setSidebarTab } = useAppStore();
  const [showRaw, setShowRaw] = useState(false);

  const errors = compileResult?.errors ?? [];
  const hasContent = compileResult !== null;

  const handleFixWithAI = () => {
    if (!compileResult) return;
    
    let prompt = "Tengo los siguientes errores de compilación en mi documento LaTeX:\n\n";
    if (showRaw) {
      prompt += `\`\`\`log\n${compileResult.raw_log}\n\`\`\``;
    } else {
      errors.forEach(e => {
        prompt += `- Línea ${e.line ?? '?'}: ${e.message}\n`;
      });
    }
    prompt += "\nPor favor explícame a qué se deben y dame el código para solucionarlos.";
    
    setPendingAiPrompt(prompt);
    setSidebarTab("ai");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800 shrink-0">
        <p className="text-xs font-semibold text-zinc-300 flex-1">Compilación</p>
        {hasContent && (
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            {showRaw ? "Errores" : "Log raw"}
          </button>
        )}
      </div>

      {/* Status pill */}
      <div className="px-3 py-2 shrink-0">
        {compileStatus === "idle" && (
          <span className="text-xs text-zinc-600">Sin compilar</span>
        )}
        {compileStatus === "compiling" && (
          <span className="text-xs text-emerald-400 animate-pulse">● Compilando…</span>
        )}
        {compileStatus === "success" && (
          <span className="text-xs text-emerald-500">✓ Compilado correctamente</span>
        )}
        {compileStatus === "error" && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-red-400">
              ✕ {errors.length} error{errors.length !== 1 ? "es" : ""}
            </span>
            <button
              onClick={handleFixWithAI}
              className="px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-[10px] font-medium rounded border border-purple-500/20 transition-colors flex items-center gap-1"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
                <path d="M12 12 2.1 7.1" />
                <path d="M12 12l9.9 4.9" />
              </svg>
              Solucionar con IA
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {showRaw ? (
          <pre className="text-[11px] text-zinc-500 px-3 pb-4 whitespace-pre-wrap break-all font-mono leading-relaxed">
            {compileResult?.raw_log || "(vacío)"}
          </pre>
        ) : (
          errors.map((e, i) => (
            <div
              key={i}
              className="flex gap-2 px-3 py-2 border-b border-zinc-900 last:border-0"
            >
              <span className="shrink-0 mt-0.5">{kindIcon(e.kind)}</span>
              <div className="min-w-0">
                {e.line !== undefined && (
                  <span className="text-[10px] text-zinc-600 mr-2">
                    línea {e.line}
                  </span>
                )}
                <span className={`text-xs break-words ${kindLabel(e.kind)}`}>
                  {e.message}
                </span>
              </div>
            </div>
          ))
        )}
        {!hasContent && (
          <p className="text-xs text-zinc-600 px-4 py-6 text-center">
            Compila un archivo para ver los logs.
          </p>
        )}
      </div>
    </div>
  );
}
