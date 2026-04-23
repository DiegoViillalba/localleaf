import { create } from "zustand";
import type { AiConfig, AiStatus, CompileResult, CompileStatus, FileEntry } from "../types";

export type SidebarTab = "files" | "search" | "logs" | "outline";

interface AppState {
  // Workspace
  workspaceDir: string | null;
  projectTree: FileEntry | null;

  // Open files — future: tab bar
  openFiles: string[];
  activeFilePath: string | null;
  content: string;
  isDirty: boolean;

  // Compilation
  rootFilePath: string | null;
  compileStatus: CompileStatus;
  compileResult: CompileResult | null;
  pdfPath: string | null;

  // AI
  aiStatus: AiStatus;
  aiBuffer: string;
  aiConfig: AiConfig;

  // UI
  tectonicAvailable: boolean;
  sidebarTab: SidebarTab;
  editorJumpLine: number | null;

  // Actions — workspace
  setWorkspace: (dir: string, tree: FileEntry, rootPath?: string | null) => void;
  setProjectTree: (tree: FileEntry) => void;
  setRootFilePath: (path: string | null) => void;

  // Actions — files
  openFile: (path: string, content: string) => void;
  closeFile: (path: string) => void;
  setContent: (content: string) => void;
  markClean: () => void;

  // Actions — compilation
  setCompileStatus: (status: CompileStatus) => void;
  setCompileResult: (result: CompileResult) => void;
  setPdfPath: (path: string | null) => void;

  // Actions — AI
  setAiStatus: (status: AiStatus) => void;
  appendAiToken: (token: string) => void;
  clearAiBuffer: () => void;
  setAiConfig: (config: Partial<AiConfig>) => void;

  // Actions — UI
  setTectonicAvailable: (v: boolean) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setEditorJumpLine: (line: number | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  workspaceDir: null,
  projectTree: null,
  openFiles: [],
  activeFilePath: null,
  content: "",
  isDirty: false,
  rootFilePath: null,
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
  sidebarTab: "files",
  editorJumpLine: null,

  setWorkspace: (dir, tree, rootPath = null) =>
    set({ workspaceDir: dir, projectTree: tree, rootFilePath: rootPath }),
  setProjectTree: (tree) => set({ projectTree: tree }),
  setRootFilePath: (path) => set({ rootFilePath: path }),

  openFile: (path, content) =>
    set((s) => ({
      activeFilePath: path,
      content,
      isDirty: false,
      openFiles: s.openFiles.includes(path) ? s.openFiles : [...s.openFiles, path],
    })),
  closeFile: (path) =>
    set((s) => {
      const openFiles = s.openFiles.filter((p) => p !== path);
      const activeFilePath =
        s.activeFilePath === path
          ? (openFiles[openFiles.length - 1] ?? null)
          : s.activeFilePath;
      return { openFiles, activeFilePath };
    }),
  setContent: (content) => set({ content, isDirty: true }),
  markClean: () => set({ isDirty: false }),

  setCompileStatus: (status) => set({ compileStatus: status }),
  setCompileResult: (result) => set({ compileResult: result }),
  setPdfPath: (path) => set({ pdfPath: path }),

  setAiStatus: (status) => set({ aiStatus: status }),
  appendAiToken: (token) => set((s) => ({ aiBuffer: s.aiBuffer + token })),
  clearAiBuffer: () => set({ aiBuffer: "" }),
  setAiConfig: (config) =>
    set((s) => ({ aiConfig: { ...s.aiConfig, ...config } })),

  setTectonicAvailable: (v) => set({ tectonicAvailable: v }),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setEditorJumpLine: (line) => set({ editorJumpLine: line }),
}));
