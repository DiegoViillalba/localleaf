// Core domain types for LocalLeaf

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  extension?: string;
  children?: FileEntry[];
}

export interface CompileResult {
  success: boolean;
  pdf_path?: string;
  errors: LaTeXError[];
  raw_log: string;
  needs_shell_escape: boolean;
}


export interface LaTeXError {
  line?: number;
  message: string;
  kind: "error" | "warning" | "info";
}

export interface AiConfig {
  api_key: string;
  provider_url: string;
  model: string;
}

export interface AiRequest {
  config: AiConfig;
  preamble: string;
  selection: string;
  context: string;
}

export type CompileStatus = "idle" | "compiling" | "success" | "error";

export type AiStatus = "idle" | "streaming" | "done" | "error";

export interface LatexConfig {
  shellEscape: boolean;
}

export interface EditorConfig {
  codeFolding: boolean;
  wordWrap: boolean;
  lineNumbers: boolean;
  highlightActiveLine: boolean;
  matchBrackets: boolean;
  autoComplete: boolean;
  spellCheck: boolean;
}

