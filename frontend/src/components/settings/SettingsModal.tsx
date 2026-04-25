import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../../store/useAppStore";
import { useClickOutside } from "../../hooks/useClickOutside";

interface TectonicStatus {
  installed: boolean;
  version: string | null;
  cache_dir: string | null;
  bundle_cached: boolean;
}

type SettingsView = "main" | "latex" | "ai" | "app" | "git";

export function SettingsModal() {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    settings,
    setLatexSettings,
    aiConfig,
    setAiConfig,
    latexConfig,
    setLatexConfig,
    editorConfig,
    setEditorConfig,
    gitConfig,
    setGitConfig,
  } = useAppStore();

  const [activeView, setActiveView] = useState<SettingsView>("main");
  
  const [loading, setLoading] = useState(false);
  const [warming, setWarming] = useState(false);
  const [status, setStatus] = useState<TectonicStatus | null>(null);
  
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  const modalRef = useClickOutside<HTMLDivElement>(() => setIsSettingsOpen(false));

  const checkEnvironment = async () => {
    setLoading(true);
    try {
      const res = await invoke<TectonicStatus>("get_tectonic_status");
      setStatus(res);
      setLatexSettings({
        installed: res.installed,
        version: res.version || undefined,
        cacheReady: res.bundle_cached,
      });
    } catch (err) {
      console.error("Error checking environment:", err);
    } finally {
      setLoading(false);
    }
  };

  const warmCache = async () => {
    setWarming(true);
    try {
      await invoke("warm_cache");
      await checkEnvironment();
    } catch (err) {
      console.error("Error warming cache:", err);
    } finally {
      setWarming(false);
    }
  };

  useEffect(() => {
    if (isSettingsOpen && activeView === "latex" && !status) {
      checkEnvironment();
    }
  }, [isSettingsOpen, activeView]);

  if (!isSettingsOpen) return null;

  const renderMainView = () => (
    <div className="flex-1 overflow-y-auto p-2">
      <div className="mb-4">
        <h4 className="px-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
          Entorno
        </h4>
        <div className="bg-zinc-800/50 rounded-lg overflow-hidden border border-zinc-800">
          <button
            onClick={() => setActiveView("latex")}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-zinc-700/50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 flex items-center justify-center bg-emerald-500/10 text-emerald-500 rounded">
                τ
              </span>
              <span className="text-sm text-zinc-200">LaTeX</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">
                {settings.latex.installed ? "Instalado" : "No detectado"}
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </button>
        </div>
      </div>

      <div>
        <h4 className="px-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
          Preferencias
        </h4>
        <div className="bg-zinc-800/50 rounded-lg overflow-hidden border border-zinc-800 flex flex-col">
          <button
            onClick={() => setActiveView("app")}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-zinc-700/50 transition-colors text-left border-b border-zinc-800"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 flex items-center justify-center bg-blue-500/10 text-blue-500 rounded">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </span>
              <span className="text-sm text-zinc-200">App</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <button
            onClick={() => setActiveView("ai")}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-zinc-700/50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 flex items-center justify-center bg-purple-500/10 text-purple-500 rounded">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
                  <path d="M12 12 2.1 7.1" />
                  <path d="M12 12l9.9 4.9" />
                </svg>
              </span>
              <span className="text-sm text-zinc-200">IA / Asistente</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <button
            onClick={() => setActiveView("app")}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-zinc-700/50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 flex items-center justify-center bg-orange-500/10 text-orange-500 rounded">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </span>
              <span className="text-sm text-zinc-200">Editor</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <button
            onClick={() => setActiveView("git")}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-zinc-700/50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 flex items-center justify-center bg-zinc-500/10 text-zinc-400 rounded">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
                </svg>
              </span>
              <span className="text-sm text-zinc-200">Versionado (Git)</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  const renderLatexView = () => (
    <div className="flex-1 overflow-y-auto p-4 animate-in slide-in-from-right-4 duration-150">
      <div className="space-y-4">
        {/* Engine status */}
        <div className="bg-zinc-800/50 rounded-lg overflow-hidden border border-zinc-800 p-3 text-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Engine</span>
            <span className="flex items-center gap-1.5 text-zinc-200 font-medium">
              {status?.installed ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-red-500" />
              )}
              Tectonic
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Versión</span>
            <span className="text-zinc-300 font-mono text-xs">
              {status?.version || "Desconocida"}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Caché (Bundle)</span>
            <span className="text-zinc-300">
              {status?.bundle_cached ? "Lista" : "Vacía / Desconocida"}
            </span>
          </div>
        </div>

        {/* Compilation mode */}
        <div>
          <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Compilación
          </h4>

          {/* Safe / Advanced mode selector */}
          <div className="flex rounded-lg overflow-hidden border border-zinc-700 mb-3">
            <button
              id="latex-mode-safe"
              onClick={() => setLatexConfig({ shellEscape: false })}
              className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                !latexConfig.shellEscape
                  ? "bg-emerald-600/20 text-emerald-400"
                  : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50"
              }`}
            >
              Modo Seguro
            </button>
            <button
              id="latex-mode-advanced"
              onClick={() => setLatexConfig({ shellEscape: true })}
              className={`flex-1 py-1.5 text-xs font-medium transition-colors border-l border-zinc-700 ${
                latexConfig.shellEscape
                  ? "bg-amber-600/20 text-amber-400"
                  : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50"
              }`}
            >
              Modo Avanzado
            </button>
          </div>

          {/* shell-escape toggle */}
          <div className="bg-zinc-800/50 rounded-lg border border-zinc-800 overflow-hidden">
            <label
              htmlFor="toggle-shell-escape"
              className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-zinc-700/30 transition-colors"
            >
              <div>
                <p className="text-sm text-zinc-200">Comandos externos (shell-escape)</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Requerido por paquetes como <span className="font-mono text-zinc-400">minted</span>
                </p>
              </div>
              {/* Toggle pill */}
              <div
                id="toggle-shell-escape"
                role="switch"
                aria-checked={latexConfig.shellEscape}
                onClick={() => setLatexConfig({ shellEscape: !latexConfig.shellEscape })}
                className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ml-3 cursor-pointer ${
                  latexConfig.shellEscape ? "bg-amber-500" : "bg-zinc-600"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    latexConfig.shellEscape ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </div>
            </label>

            {/* Security warning — only visible when enabled */}
            {latexConfig.shellEscape && (
              <div className="mx-3 mb-3 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-md flex gap-2">
                <span className="text-amber-400 text-sm flex-shrink-0 mt-px">⚠</span>
                <p className="text-xs text-amber-300/80 leading-relaxed">
                  Esto permite que LaTeX ejecute comandos del sistema operativo durante la
                  compilación. Actívalo solo si tu documento lo requiere y confías en su contenido.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Environment actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={checkEnvironment}
            disabled={loading}
            className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 text-sm font-medium rounded transition-colors"
          >
            {loading ? "Comprobando..." : "Comprobar Entorno"}
          </button>
          <button
            onClick={warmCache}
            disabled={warming || !status?.installed}
            className="w-full py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 disabled:opacity-50 text-sm font-medium rounded transition-colors"
          >
            {warming ? "Descargando paquetes..." : "Pre-calentar Caché"}
          </button>
        </div>
      </div>
    </div>
  );


  const renderAiView = () => (
    <div className="flex-1 overflow-y-auto p-4 animate-in slide-in-from-right-4 duration-150">
      <div className="space-y-4">
        
        {/* Helper Presets */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setAiConfig({ provider_url: "https://api.openai.com/v1", model: "gpt-4o" })}
              className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded transition-colors"
            >
              OpenAI
            </button>
            <button
              onClick={() => setAiConfig({ provider_url: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-1.5-pro" })}
              className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded transition-colors"
            >
              Gemini
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAiConfig({ provider_url: "http://localhost:1234/v1", model: "local-model" })}
              className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded transition-colors"
            >
              LM Studio Local
            </button>
            <button
              onClick={() => setAiConfig({ provider_url: "http://localhost:11434/v1", model: "llama3" })}
              className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded transition-colors"
            >
              Ollama Local
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Provider URL
            </label>
            <input
              type="text"
              value={aiConfig.provider_url}
              onChange={(e) => setAiConfig({ provider_url: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm text-zinc-200 outline-none focus:border-emerald-500 transition-colors"
              placeholder="https://api.openai.com/v1"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-medium text-zinc-400">
                Model Name
              </label>
              <button
                onClick={async () => {
                  setFetchingModels(true);
                  setModelError(null);
                  try {
                    const models = await invoke<string[]>("fetch_available_models", {
                      providerUrl: aiConfig.provider_url,
                      apiKey: aiConfig.api_key,
                    });
                    setAvailableModels(models);
                  } catch (err) {
                    setModelError(String(err));
                  } finally {
                    setFetchingModels(false);
                  }
                }}
                disabled={fetchingModels || !aiConfig.provider_url}
                className="text-[10px] text-emerald-500 hover:text-emerald-400 disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                {fetchingModels ? "Cargando..." : "Cargar modelos de la API"}
              </button>
            </div>
            
            {availableModels.length > 0 ? (
              <select
                value={aiConfig.model}
                onChange={(e) => setAiConfig({ model: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm text-zinc-200 outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="" disabled>Selecciona un modelo...</option>
                {availableModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={aiConfig.model}
                onChange={(e) => setAiConfig({ model: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm text-zinc-200 outline-none focus:border-emerald-500 transition-colors"
                placeholder="gpt-4o"
              />
            )}
            
            {modelError && (
              <p className="text-[10px] text-red-500 mt-1">
                {modelError}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              API Key
            </label>
            <input
              type="password"
              value={aiConfig.api_key}
              onChange={(e) => setAiConfig({ api_key: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm text-zinc-200 outline-none focus:border-emerald-500 transition-colors"
              placeholder="sk-... (Déjalo vacío para APIs locales)"
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              La API Key se guarda localmente en tu sistema. No requerida para LM Studio / Ollama.
            </p>
          </div>
        </div>

      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        ref={modalRef}
        className="w-[500px] h-[400px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
          {activeView !== "main" && (
            <button
              onClick={() => setActiveView("main")}
              className="mr-3 p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          <h2 className="text-base font-semibold text-zinc-100">
            {activeView === "main" && "Configuración Global"}
            {activeView === "latex" && "Entorno LaTeX"}
            {activeView === "ai" && "Inteligencia Artificial"}
            {activeView === "app" && "Editor"}
            {activeView === "git" && "Control de Versiones"}
          </h2>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="ml-auto p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        {activeView === "main" && renderMainView()}
        {activeView === "latex" && renderLatexView()}
        {activeView === "ai" && renderAiView()}
        {activeView === "app" && (
          <div className="flex-1 overflow-y-auto p-4 animate-in slide-in-from-right-4 duration-150">
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Editor de Código
                </h4>
                
                <div className="bg-zinc-800/50 rounded-lg border border-zinc-800 overflow-hidden">
                  <label
                    htmlFor="toggle-code-folding"
                    className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-zinc-700/30 transition-colors border-b border-zinc-800"
                  >
                    <div>
                      <p className="text-sm text-zinc-200">Plegado de código (Code Folding)</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Permite ocultar y mostrar bloques de código en el margen izquierdo.
                      </p>
                    </div>
                    <div
                      id="toggle-code-folding"
                      role="switch"
                      aria-checked={editorConfig.codeFolding}
                      onClick={() => setEditorConfig({ codeFolding: !editorConfig.codeFolding })}
                      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ml-3 cursor-pointer ${
                        editorConfig.codeFolding ? "bg-emerald-500" : "bg-zinc-600"
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editorConfig.codeFolding ? "translate-x-4" : "translate-x-0"}`} />
                    </div>
                  </label>

                  <label
                    htmlFor="toggle-word-wrap"
                    className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-zinc-700/30 transition-colors border-b border-zinc-800"
                  >
                    <div>
                      <p className="text-sm text-zinc-200">Ajuste de línea (Word Wrap)</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Ajusta el texto largo al ancho del editor.</p>
                    </div>
                    <div
                      id="toggle-word-wrap"
                      role="switch"
                      aria-checked={editorConfig.wordWrap}
                      onClick={() => setEditorConfig({ wordWrap: !editorConfig.wordWrap })}
                      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ml-3 cursor-pointer ${editorConfig.wordWrap ? "bg-emerald-500" : "bg-zinc-600"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editorConfig.wordWrap ? "translate-x-4" : "translate-x-0"}`} />
                    </div>
                  </label>

                  <label
                    htmlFor="toggle-line-numbers"
                    className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-zinc-700/30 transition-colors border-b border-zinc-800"
                  >
                    <div>
                      <p className="text-sm text-zinc-200">Números de línea</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Muestra los números de línea en el margen.</p>
                    </div>
                    <div
                      id="toggle-line-numbers"
                      role="switch"
                      aria-checked={editorConfig.lineNumbers}
                      onClick={() => setEditorConfig({ lineNumbers: !editorConfig.lineNumbers })}
                      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ml-3 cursor-pointer ${editorConfig.lineNumbers ? "bg-emerald-500" : "bg-zinc-600"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editorConfig.lineNumbers ? "translate-x-4" : "translate-x-0"}`} />
                    </div>
                  </label>

                  <label
                    htmlFor="toggle-highlight-line"
                    className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-zinc-700/30 transition-colors border-b border-zinc-800"
                  >
                    <div>
                      <p className="text-sm text-zinc-200">Resaltar línea actual</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Destaca el fondo de la línea donde está el cursor.</p>
                    </div>
                    <div
                      id="toggle-highlight-line"
                      role="switch"
                      aria-checked={editorConfig.highlightActiveLine}
                      onClick={() => setEditorConfig({ highlightActiveLine: !editorConfig.highlightActiveLine })}
                      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ml-3 cursor-pointer ${editorConfig.highlightActiveLine ? "bg-emerald-500" : "bg-zinc-600"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editorConfig.highlightActiveLine ? "translate-x-4" : "translate-x-0"}`} />
                    </div>
                  </label>

                  <label
                    htmlFor="toggle-match-brackets"
                    className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-zinc-700/30 transition-colors border-b border-zinc-800"
                  >
                    <div>
                      <p className="text-sm text-zinc-200">Emparejar corchetes (Brackets)</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Resalta y cierra automáticamente corchetes y paréntesis.</p>
                    </div>
                    <div
                      id="toggle-match-brackets"
                      role="switch"
                      aria-checked={editorConfig.matchBrackets}
                      onClick={() => setEditorConfig({ matchBrackets: !editorConfig.matchBrackets })}
                      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ml-3 cursor-pointer ${editorConfig.matchBrackets ? "bg-emerald-500" : "bg-zinc-600"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editorConfig.matchBrackets ? "translate-x-4" : "translate-x-0"}`} />
                    </div>
                  </label>

                  <label
                    htmlFor="toggle-autocomplete"
                    className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-zinc-700/30 transition-colors border-b border-zinc-800"
                  >
                    <div>
                      <p className="text-sm text-zinc-200">Autocompletado y Snippets</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Sugerencias automáticas y fragmentos de código LaTeX.</p>
                    </div>
                    <div
                      id="toggle-autocomplete"
                      role="switch"
                      aria-checked={editorConfig.autoComplete}
                      onClick={() => setEditorConfig({ autoComplete: !editorConfig.autoComplete })}
                      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ml-3 cursor-pointer ${editorConfig.autoComplete ? "bg-emerald-500" : "bg-zinc-600"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editorConfig.autoComplete ? "translate-x-4" : "translate-x-0"}`} />
                    </div>
                  </label>

                  <label
                    htmlFor="toggle-spellcheck"
                    className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-zinc-700/30 transition-colors"
                  >
                    <div>
                      <p className="text-sm text-zinc-200">Corrector ortográfico</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Habilita el corrector nativo del sistema operativo.</p>
                    </div>
                    <div
                      id="toggle-spellcheck"
                      role="switch"
                      aria-checked={editorConfig.spellCheck}
                      onClick={() => setEditorConfig({ spellCheck: !editorConfig.spellCheck })}
                      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ml-3 cursor-pointer ${editorConfig.spellCheck ? "bg-emerald-500" : "bg-zinc-600"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editorConfig.spellCheck ? "translate-x-4" : "translate-x-0"}`} />
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeView === "git" && (
          <div className="flex-1 overflow-y-auto p-4 animate-in slide-in-from-right-4 duration-150">
            <div className="space-y-6">
              
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Frecuencia de Guardado
                </h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-zinc-800/50 border border-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-700/30 transition-colors">
                    <input 
                      type="radio" 
                      name="git-interval" 
                      checked={gitConfig.intervalMinutes === 2}
                      onChange={() => setGitConfig({ intervalMinutes: 2 })}
                      className="text-emerald-500 focus:ring-emerald-500/20 bg-zinc-900 border-zinc-700"
                    />
                    <div className="text-sm text-zinc-200">Cada 2 minutos de inactividad</div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-zinc-800/50 border border-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-700/30 transition-colors">
                    <input 
                      type="radio" 
                      name="git-interval" 
                      checked={gitConfig.intervalMinutes === 5}
                      onChange={() => setGitConfig({ intervalMinutes: 5 })}
                      className="text-emerald-500 focus:ring-emerald-500/20 bg-zinc-900 border-zinc-700"
                    />
                    <div className="text-sm text-zinc-200">Cada 5 minutos de inactividad</div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-zinc-800/50 border border-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-700/30 transition-colors">
                    <input 
                      type="radio" 
                      name="git-interval" 
                      checked={gitConfig.intervalMinutes === 10}
                      onChange={() => setGitConfig({ intervalMinutes: 10 })}
                      className="text-emerald-500 focus:ring-emerald-500/20 bg-zinc-900 border-zinc-700"
                    />
                    <div className="text-sm text-zinc-200">Cada 10 minutos de inactividad</div>
                  </label>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Sincronización (Opcional)
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      URL del Repositorio (Ej: https://github.com/usuario/repo.git)
                    </label>
                    <input
                      type="text"
                      value={gitConfig.repoUrl}
                      onChange={(e) => setGitConfig({ repoUrl: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm text-zinc-200 outline-none focus:border-emerald-500 transition-colors"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Token de Acceso Personal (PAT)
                    </label>
                    <input
                      type="password"
                      value={gitConfig.pat}
                      onChange={(e) => setGitConfig({ pat: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm text-zinc-200 outline-none focus:border-emerald-500 transition-colors"
                      placeholder="ghp_..."
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">
                      Necesario para sincronizar repositorios privados. Se almacena localmente de forma segura.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
