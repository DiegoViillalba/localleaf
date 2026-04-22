import { useCallback, useEffect, useRef } from "react";
import { onAiDone, onAiToken, streamAiAssist } from "../lib/tauri";
import { useAppStore } from "../store/useAppStore";

/** Extract the \documentclass...first-\begin{document} block as preamble */
function extractPreamble(src: string): string {
  const idx = src.indexOf("\\begin{document}");
  return idx > -1 ? src.slice(0, idx) : src.slice(0, 500);
}

export function useAiAssist() {
  const {
    content,
    aiConfig,
    aiStatus,
    aiBuffer,
    setAiStatus,
    appendAiToken,
    clearAiBuffer,
  } = useAppStore();

  const unlistenToken = useRef<(() => void) | null>(null);
  const unlistenDone = useRef<(() => void) | null>(null);

  // Register listeners once
  useEffect(() => {
    let tokenUnsub: (() => void) | null = null;
    let doneUnsub: (() => void) | null = null;

    onAiToken((token) => appendAiToken(token)).then((fn) => {
      tokenUnsub = fn;
      unlistenToken.current = fn;
    });
    onAiDone(() => setAiStatus("done")).then((fn) => {
      doneUnsub = fn;
      unlistenDone.current = fn;
    });

    return () => {
      tokenUnsub?.();
      doneUnsub?.();
    };
  }, [appendAiToken, setAiStatus]);

  const assist = useCallback(
    async (selection: string) => {
      if (aiStatus === "streaming") return;
      if (!aiConfig.api_key) {
        alert("Configura tu API key en el panel de IA antes de usar AI Assist.");
        return;
      }

      clearAiBuffer();
      setAiStatus("streaming");

      const preamble = extractPreamble(content);
      // Context: up to 2 000 chars around selection to keep request small
      const selIdx = content.indexOf(selection);
      const start = Math.max(0, selIdx - 1000);
      const end = Math.min(content.length, selIdx + selection.length + 1000);
      const context = content.slice(start, end);

      try {
        await streamAiAssist({
          config: aiConfig,
          preamble,
          selection,
          context,
        });
      } catch (err) {
        setAiStatus("error");
        console.error("AI assist error:", err);
      }
    },
    [aiConfig, aiStatus, content, clearAiBuffer, setAiStatus]
  );

  return { assist, aiBuffer, aiStatus };
}
