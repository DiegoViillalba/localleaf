import { useCallback, useRef } from "react";
import { compileLatex, saveFile, cancelCompilation } from "../lib/tauri";
import { useAppStore } from "../store/useAppStore";

export function useCompile() {
  const {
    activeFilePath,
    rootFilePath,
    content,
    isDirty,
    latexConfig,
    setCompileStatus,
    setCompileResult,
    setPdfPath,
    markClean,
    setSidebarTab,
  } = useAppStore();


  const compileIdRef = useRef<string | null>(null);

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

    const currentCompileId = crypto.randomUUID();
    compileIdRef.current = currentCompileId;

    try {
      const result = await compileLatex(target, latexConfig.shellEscape, currentCompileId);

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
        needs_shell_escape: false,
      });

      setCompileStatus("error");
      setSidebarTab("logs");
    } finally {
      if (compileIdRef.current === currentCompileId) {
        compileIdRef.current = null;
      }
    }
  }, [
    activeFilePath,
    rootFilePath,
    content,
    isDirty,
    latexConfig,
    setCompileStatus,
    setCompileResult,
    setPdfPath,
    markClean,
    setSidebarTab,
  ]);


  const cancel = useCallback(() => {
    if (compileIdRef.current) {
      cancelCompilation(compileIdRef.current).catch(console.error);
      compileIdRef.current = null;
    }
  }, []);

  return { compile, cancel };
}
