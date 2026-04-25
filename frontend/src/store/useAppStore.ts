import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AiConfig, AiStatus, CompileResult, CompileStatus, FileEntry, LatexConfig, EditorConfig, GitConfig } from "../types";


export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export type SidebarTab = "files" | "search" | "logs" | "outline" | "ai" | "versions";

interface AppState {
  // Workspace
  workspaceDir: string | null;
  projectTree: FileEntry | null;

  // Open files — future: tab bar
  openFiles: string[];
  activeFilePath: string | null;
  content: string;
  originalContent: string;
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
  aiChatMessages: ChatMessage[];
  pendingAiPrompt: string | null;

  // Settings
  settings: {
    latex: {
      installed: boolean;
      version?: string;
      cacheReady: boolean;
    };
  };

  // Compilation config
  latexConfig: LatexConfig;

  // Editor config
  editorConfig: EditorConfig;

  // Theme config
  appTheme: "dark" | "light" | "custom";
  customThemeColor: string;

  // Git config
  gitConfig: GitConfig;

  // UI
  tectonicAvailable: boolean;
  sidebarTab: SidebarTab;
  editorJumpLine: number | null;
  isSettingsOpen: boolean;
  layout: {
    sidebarWidth: number;
    editorWidth: number;
    pdfWidth: number;
    isSidebarCollapsed: boolean;
    isPdfCollapsed: boolean;
  };

  // Diff Viewer
  diffViewer: {
    isOpen: boolean;
    original: string;
    modified: string;
  } | null;

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
  setAiChatMessages: (messages: ChatMessage[]) => void;
  appendAiChatMessage: (msg: ChatMessage) => void;
  updateLastAiChatMessage: (content: string) => void;
  setPendingAiPrompt: (prompt: string | null) => void;

  setDiffViewer: (state: { isOpen: boolean; original: string; modified: string } | null) => void;

  // Actions — UI
  setTectonicAvailable: (v: boolean) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setEditorJumpLine: (line: number | null) => void;
  setIsSettingsOpen: (open: boolean) => void;
  setLayout: (layout: Partial<AppState["layout"]>) => void;
  setSettings: (settings: Partial<AppState["settings"]>) => void;
  setLatexSettings: (latex: Partial<AppState["settings"]["latex"]>) => void;
  setLatexConfig: (cfg: Partial<LatexConfig>) => void;
  setEditorConfig: (cfg: Partial<EditorConfig>) => void;
  setGitConfig: (cfg: Partial<GitConfig>) => void;
  setAppTheme: (theme: AppState["appTheme"]) => void;
  setCustomThemeColor: (color: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      workspaceDir: null,
  projectTree: null,
  openFiles: [],
  activeFilePath: null,
  content: "",
  originalContent: "",
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
  aiChatMessages: [],
  pendingAiPrompt: null,
  tectonicAvailable: true,
  sidebarTab: "files",
  editorJumpLine: null,
  isSettingsOpen: false,
  diffViewer: null,
  layout: {
    sidebarWidth: 20,
    editorWidth: 40,
    pdfWidth: 40,
    isSidebarCollapsed: false,
    isPdfCollapsed: false,
  },
  settings: {
    latex: {
      installed: false,
      cacheReady: false,
    },
  },
  latexConfig: {
    shellEscape: false,
  },
  editorConfig: {
    codeFolding: true,
    wordWrap: true,
    lineNumbers: true,
    highlightActiveLine: true,
    matchBrackets: true,
    autoComplete: true,
    spellCheck: false,
  },
  appTheme: "dark",
  customThemeColor: "#3b82f6", // Default custom color (blue)
  gitConfig: {
    intervalMinutes: 5,
    repoUrl: "",
    pat: "",
  },

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
  setContent: (content) =>
    set((s) => ({
      content,
      isDirty: content !== s.originalContent,
    })),
  markClean: () =>
    set((s) => ({
      isDirty: false,
      originalContent: s.content,
    })),

  setCompileStatus: (status) => set({ compileStatus: status }),
  setCompileResult: (result) => set({ compileResult: result }),
  setPdfPath: (path) => set({ pdfPath: path }),

  setAiStatus: (status) => set({ aiStatus: status }),
  appendAiToken: (token) => set((s) => ({ aiBuffer: s.aiBuffer + token })),
  clearAiBuffer: () => set({ aiBuffer: "" }),
  setAiConfig: (config) =>
    set((s) => ({ aiConfig: { ...s.aiConfig, ...config } })),
  setAiChatMessages: (messages) => set({ aiChatMessages: messages }),
  appendAiChatMessage: (msg) => set((s) => ({ aiChatMessages: [...s.aiChatMessages, msg] })),
  updateLastAiChatMessage: (content) => set((s) => {
    const msgs = [...s.aiChatMessages];
    if (msgs.length > 0 && msgs[msgs.length - 1].role === "assistant") {
      msgs[msgs.length - 1].content += content;
    }
    return { aiChatMessages: msgs };
  }),
  setPendingAiPrompt: (prompt) => set({ pendingAiPrompt: prompt }),

  setDiffViewer: (state) => set({ diffViewer: state }),

  setTectonicAvailable: (v) => set({ tectonicAvailable: v }),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setEditorJumpLine: (line) => set({ editorJumpLine: line }),
  setIsSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setLayout: (layout) =>
    set((s) => ({ layout: { ...s.layout, ...layout } })),
  setSettings: (settings) =>
    set((s) => ({ settings: { ...s.settings, ...settings } })),
  setLatexSettings: (latex) =>
    set((s) => ({
      settings: { ...s.settings, latex: { ...s.settings.latex, ...latex } },
    })),
  setLatexConfig: (cfg) =>
    set((s) => ({ latexConfig: { ...s.latexConfig, ...cfg } })),
  setEditorConfig: (cfg) =>
    set((s) => ({ editorConfig: { ...s.editorConfig, ...cfg } })),
  setGitConfig: (cfg) =>
    set((s) => ({ gitConfig: { ...s.gitConfig, ...cfg } })),
  setAppTheme: (theme) => set({ appTheme: theme }),
  setCustomThemeColor: (color) => set({ customThemeColor: color }),

    }),
    {
      name: "localleaf-storage",
      partialize: (state) => ({
        layout: state.layout,
        aiConfig: state.aiConfig,
        settings: state.settings,
        latexConfig: state.latexConfig,
        editorConfig: state.editorConfig,
        gitConfig: state.gitConfig,
        appTheme: state.appTheme,
        customThemeColor: state.customThemeColor,
      }),

    }
  )
);
