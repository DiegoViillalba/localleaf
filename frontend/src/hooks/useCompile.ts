import { useCallback } from "react";
import { compileLatex, saveFile } from "../lib/tauri";
import { useAppStore } from "../store/useAppStore";

export function useCompile() {
  const {
    activeFilePath,
    content,
    setCompileStatus,
    setCompileResult,
    setPdfPath,
    markClean,
  } = useAppStore();

  const compile = useCallback(async () => {
    if (!activeFilePath) return;

    setCompileStatus("compiling");

    try {
      // Always save before compiling
      await saveFile(activeFilePath, content);
      markClean();

      const result = await compileLatex(activeFilePath);
      setCompileResult(result);

      if (result.success && result.pdf_path) {
        // Append a cache-busting timestamp so the PDF viewer reloads
        setPdfPath(`${result.pdf_path}?t=${Date.now()}`);
        setCompileStatus("success");
      } else {
        setCompileStatus("error");
      }
    } catch (err) {
      setCompileResult({
        success: false,
        errors: [{ line: undefined, message: String(err), kind: "error" }],
        raw_log: "",
      });
      setCompileStatus("error");
    }
  }, [activeFilePath, content, setCompileStatus, setCompileResult, setPdfPath, markClean]);

  return { compile };
}
