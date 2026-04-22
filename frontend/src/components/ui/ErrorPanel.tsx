import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import type { LaTeXError } from "../../types";

function ErrorItem({ error }: { error: LaTeXError }) {
  const kindColors: Record<string, string> = {
    error: "text-red-400",
    warning: "text-yellow-400",
    info: "text-zinc-400",
  };

  return (
    <div className={`flex gap-2 px-3 py-2 text-xs border-b border-zinc-900 ${kindColors[error.kind] ?? "text-zinc-400"}`}>
      {error.line && (
        <span className="shrink-0 text-zinc-500 w-14">
          línea {error.line}
        </span>
      )}
      <span className="break-all">{error.message}</span>
    </div>
  );
}

export function ErrorPanel() {
  const { compileResult, compileStatus } = useAppStore();
  const [showRaw, setShowRaw] = useState(false);

  if (compileStatus === "idle") return null;
  if (compileStatus === "compiling") {
    return (
      <div className="px-4 py-2 text-xs text-emerald-500 animate-pulse border-t border-zinc-800">
        Compilando…
      </div>
    );
  }
  if (compileStatus === "success" && (!compileResult?.errors?.length)) {
    return (
      <div className="px-4 py-2 text-xs text-emerald-500 border-t border-zinc-800">
        ✓ Compilado correctamente
      </div>
    );
  }

  if (!compileResult) return null;

  const errors = compileResult.errors ?? [];

  return (
    <div className="border-t border-zinc-800 bg-zinc-950 max-h-48 overflow-y-auto">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-zinc-900 sticky top-0 bg-zinc-950">
        <span className="text-xs text-red-400 flex-1">
          {errors.length} error{errors.length !== 1 ? "es" : ""}
        </span>
        <button
          onClick={() => setShowRaw((v) => !v)}
          className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          {showRaw ? "Errores" : "Log completo"}
        </button>
      </div>

      {showRaw ? (
        <pre className="text-xs text-zinc-500 p-3 whitespace-pre-wrap break-all font-mono">
          {compileResult.raw_log || "(vacío)"}
        </pre>
      ) : (
        errors.map((e, i) => <ErrorItem key={i} error={e} />)
      )}
    </div>
  );
}
