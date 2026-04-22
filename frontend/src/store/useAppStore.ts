import { create } from "zustand";
import type { AiConfig, AiStatus, CompileResult, CompileStatus, FileEntry } from "../types";

interface AppState {
  // Workspace
  workspaceDir: string | null;
  files: FileEntry[];

  // Active document
  activeFilePath: string | null;
  content: string;
  isDirty: boolean;

  // Compilation
  compileStatus: CompileStatus;
  compileResult: CompileResult | null;
  pdfPath: string | null;

  // AI
  aiStatus: AiStatus;
  aiBuffer: string;
  aiConfig: AiConfig;

  // Tectonic
  tectonicAvailable: boolean;

  // Actions
  setWorkspace: (dir: string, files: FileEntry[]) => void;
  setFiles: (files: FileEntry[]) => void;
  openFile: (path: string, content: string) => void;
  setContent: (content: string) => void;
  markClean: () => void;
  setCompileStatus: (status: CompileStatus) => void;
  setCompileResult: (result: CompileResult) => void;
  setPdfPath: (path: string | null) => void;
  setAiStatus: (status: AiStatus) => void;
  appendAiToken: (token: string) => void;
  clearAiBuffer: () => void;
  setAiConfig: (config: Partial<AiConfig>) => void;
  setTectonicAvailable: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  workspaceDir: null,
  files: [],
  activeFilePath: null,
  content: "",
  isDirty: false,
  compileStatus: "idle",
  compileResult: null,
  pdfPath: null,
  aiStatus: "idle",
  aiBuffer: "",
  aiConfig: {
    api_key: "",
    provider_url: "https://api.openai.com/v1",
    model: "gpt-4o",
  },
  tectonicAvailable: true,

  setWorkspace: (dir, files) =>
    set({ workspaceDir: dir, files }),
  setFiles: (files) => set({ files }),
  openFile: (path, content) =>
    set({ activeFilePath: path, content, isDirty: false }),
  setContent: (content) => set({ content, isDirty: true }),
  markClean: () => set({ isDirty: false }),
  setCompileStatus: (status) => set({ compileStatus: status }),
  setCompileResult: (result) => set({ compileResult: result }),
  setPdfPath: (path) => set({ pdfPath: path }),
  setAiStatus: (status) => set({ aiStatus: status }),
  appendAiToken: (token) =>
    set((s) => ({ aiBuffer: s.aiBuffer + token })),
  clearAiBuffer: () => set({ aiBuffer: "" }),
  setAiConfig: (config) =>
    set((s) => ({ aiConfig: { ...s.aiConfig, ...config } })),
  setTectonicAvailable: (v) => set({ tectonicAvailable: v }),
}));
