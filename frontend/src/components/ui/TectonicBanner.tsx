import { useAppStore } from "../../store/useAppStore";

export function TectonicBanner() {
  const { tectonicAvailable } = useAppStore();
  if (tectonicAvailable) return null;

  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-amber-950/40 border-b border-amber-800/50 text-xs text-amber-300">
      <span className="text-amber-500 text-base shrink-0">⚠</span>
      <div>
        <p className="font-semibold mb-1">Tectonic no está instalado</p>
        <p className="text-amber-400/80">
          Para compilar documentos LaTeX necesitas Tectonic.
        </p>
        <div className="mt-2 font-mono bg-zinc-900/60 rounded px-2 py-1.5 space-y-0.5 text-amber-300/70">
          <p>macOS: <span className="text-emerald-400">brew install tectonic</span></p>
          <p>Linux: <span className="text-emerald-400">cargo install tectonic</span></p>
          <p>
            Windows:{" "}
            <a
              href="https://tectonic-typesetting.github.io"
              className="text-emerald-400 underline"
              target="_blank"
              rel="noreferrer"
            >
              tectonic-typesetting.github.io
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
