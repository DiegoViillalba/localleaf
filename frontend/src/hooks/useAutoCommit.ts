import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../store/useAppStore";

export function useAutoCommit() {
  const { workspaceDir, content, gitConfig } = useAppStore();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!workspaceDir) return;

    if (gitConfig.intervalMinutes === 0) return;

    // Clear previous timer
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    // Set new timer for inactivity
    const intervalMs = gitConfig.intervalMinutes * 60 * 1000;
    
    timerRef.current = window.setTimeout(async () => {
      try {
        // "Editando sección ..." or similar based on content
        // For now, a generic auto-commit message
        await invoke("git_commit", {
          workspace: workspaceDir,
          message: "Auto-commit: Guardado automático de versiones"
        });
        console.log("[Auto-commit] executed successfully");
      } catch (err) {
        console.error("[Auto-commit] failed", err);
      }
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [content, workspaceDir, gitConfig.intervalMinutes]);
}
