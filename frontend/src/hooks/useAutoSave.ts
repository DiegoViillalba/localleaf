import { useEffect, useRef } from "react";
import { saveFile } from "../lib/tauri";
import { useAppStore } from "../store/useAppStore";

const AUTOSAVE_DELAY_MS = 5_000;

/**
 * Auto-saves the active document 5 seconds after the last edit.
 * Resets the timer on every keystroke.
 */
export function useAutoSave() {
  const { activeFilePath, content, isDirty, markClean } = useAppStore();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isDirty || !activeFilePath) return;

    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(async () => {
      try {
        await saveFile(activeFilePath, content);
        markClean();
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [content, isDirty, activeFilePath, markClean]);
}
