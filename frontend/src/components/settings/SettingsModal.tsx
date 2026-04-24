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

type SettingsView = "main" | "latex" | "ai" | "app";

export function SettingsModal() {
  const { isSettingsOpen, setIsSettingsOpen, settings, setLatexSettings, aiConfig, setAiConfig } = useAppStore();
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
        </div>
      </div>
    </div>
  );

  const renderLatexView = () => (
    <div className="flex-1 overflow-y-auto p-4 animate-in slide-in-from-right-4 duration-150">
      <div className="space-y-4">
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
            {activeView === "app" && "Aplicación"}
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
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm animate-in slide-in-from-right-4 duration-150">
            Próximamente
          </div>
        )}
      </div>
    </div>
  );
}
