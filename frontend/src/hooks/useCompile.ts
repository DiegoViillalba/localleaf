import { useCallback } from "react";
import { compileLatex, saveFile } from "../lib/tauri";
import { useAppStore } from "../store/useAppStore";

export function useCompile() {
  const {
    activeFilePath,
    rootFilePath,
    content,
    isDirty,
    setCompileStatus,
    setCompileResult,
    setPdfPath,
    markClean,
    setSidebarTab,
  } = useAppStore();

  const compile = useCallback(async () => {
    // Always flush the active file before compiling
    if (activeFilePath && isDirty) {
      await saveFile(activeFilePath, content);
      markClean();
    }

    // Compile the designated root, falling back to the active file
    const target = rootFilePath ?? activeFilePath;
    if (!target) return;

    setCompileStatus("compiling");

    try {
      const result = await compileLatex(target);
      setCompileResult(result);

      if (result.success && result.pdf_path) {
        setPdfPath(`${result.pdf_path}?t=${Date.now()}`);
        setCompileStatus("success");
      } else {
        setCompileStatus("error");
        setSidebarTab("logs");
      }
    } catch (err) {
      setCompileResult({
        success: false,
        errors: [{ line: undefined, message: String(err), kind: "error" }],
        raw_log: "",
      });
      setCompileStatus("error");
      setSidebarTab("logs");
    }
  }, [
    activeFilePath,
    rootFilePath,
    content,
    isDirty,
    setCompileStatus,
    setCompileResult,
    setPdfPath,
    markClean,
    setSidebarTab,
  ]);

  return { compile };
}
