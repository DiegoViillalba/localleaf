import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { AiRequest, CompileResult, FileEntry } from "../types";

// ---------- Compiler ----------

export const compileLatex = (texPath: string): Promise<CompileResult> =>
  invoke("compile_latex", { texPath });

export const checkTectonic = (): Promise<boolean> =>
  invoke("check_tectonic");

// ---------- File System ----------

export const readFile = (path: string): Promise<string> =>
  invoke("read_file", { path });

export const readFileBytes = (path: string): Promise<number[]> =>
  invoke("read_file_bytes", { path });

export const saveFile = (path: string, content: string): Promise<void> =>
  invoke("save_file", { path, content });

export const listDirectory = (dirPath: string): Promise<FileEntry[]> =>
  invoke("list_directory", { dirPath });

export const openFolderDialog = (): Promise<string | null> =>
  invoke("open_folder_dialog");

export const createProject = (
  workspaceDir: string,
  projectName: string
): Promise<string> =>
  invoke("create_project", { workspaceDir, projectName });

// ---------- AI ----------

export const streamAiAssist = (request: AiRequest): Promise<void> =>
  invoke("stream_ai_assist", { request });

// ---------- Event listeners ----------

export const onAiToken = (handler: (token: string) => void) =>
  listen<string>("ai-token", (e) => handler(e.payload));

export const onAiDone = (handler: () => void) =>
  listen("ai-done", handler);

export const onTectonicMissing = (handler: (msg: string) => void) =>
  listen<string>("tectonic-missing", (e) => handler(e.payload));
