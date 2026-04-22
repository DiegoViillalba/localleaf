import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { useAiAssist } from "../../hooks/useAiAssist";

export function AiPanel() {
  const { aiConfig, setAiConfig, aiStatus, aiBuffer, setContent, content } = useAppStore();
  const { aiStatus: status } = useAiAssist();
  const [open, setOpen] = useState(false);

  const handleInsert = () => {
    if (!aiBuffer) return;
    // Append AI output at end of document
    useAppStore.getState().setContent(content + "\n" + aiBuffer);
    useAppStore.getState().clearAiBuffer();
    useAppStore.getState().setAiStatus("idle");
  };

  const handleDiscard = () => {
    useAppStore.getState().clearAiBuffer();
    useAppStore.getState().setAiStatus("idle");
  };

  return (
    <>
      {/* Toggle button in status bar */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2"
      >
        ✦ IA
      </button>

      {/* Slide-in panel */}
      {open && (
        <div className="absolute right-0 bottom-8 w-80 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-50 flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
            <span className="text-xs font-semibold text-zinc-300">Configuración IA</span>
            <button
              onClick={() => setOpen(false)}
              className="text-zinc-600 hover:text-zinc-200 text-sm"
            >
              ✕
            </button>
          </div>

          <div className="p-3 flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">API Key</span>
              <input
                type="password"
                value={aiConfig.api_key}
                onChange={(e) => setAiConfig({ api_key: e.target.value })}
                placeholder="sk-..."
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5
                           text-xs text-zinc-200 outline-none focus:border-emerald-600 transition-colors"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">Provider URL</span>
              <input
                type="text"
                value={aiConfig.provider_url}
                onChange={(e) => setAiConfig({ provider_url: e.target.value })}
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5
                           text-xs text-zinc-200 outline-none focus:border-emerald-600 transition-colors"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">Modelo</span>
              <input
                type="text"
                value={aiConfig.model}
                onChange={(e) => setAiConfig({ model: e.target.value })}
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5
                           text-xs text-zinc-200 outline-none focus:border-emerald-600 transition-colors"
              />
            </label>
          </div>

          {/* AI output buffer */}
          {(status === "streaming" || status === "done") && (
            <div className="border-t border-zinc-800 p-3 flex flex-col gap-2">
              <span className="text-xs text-zinc-500">
                {status === "streaming" ? (
                  <span className="text-emerald-400 animate-pulse">Generando…</span>
                ) : (
                  "Resultado"
                )}
              </span>
              <pre className="text-xs text-zinc-300 bg-zinc-800 rounded p-2 max-h-40 overflow-y-auto whitespace-pre-wrap font-mono">
                {aiBuffer || " "}
              </pre>
              {status === "done" && (
                <div className="flex gap-2">
                  <button
                    onClick={handleInsert}
                    className="flex-1 py-1.5 rounded text-xs font-medium bg-emerald-800 text-emerald-200
                               hover:bg-emerald-700 transition-colors"
                  >
                    Insertar
                  </button>
                  <button
                    onClick={handleDiscard}
                    className="flex-1 py-1.5 rounded text-xs font-medium bg-zinc-800 text-zinc-400
                               hover:bg-zinc-700 transition-colors"
                  >
                    Descartar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
