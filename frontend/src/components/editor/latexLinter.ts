import { Diagnostic } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";

export function latexLinter(view: EditorView): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const doc = view.state.doc;
  const content = doc.toString();

  // Regex to find \begin{env} and \end{env}
  const regex = /\\(begin|end)\s*\{([^}]+)\}/g;
  
  interface OpenEnv {
    name: string;
    from: number;
    to: number;
  }
  
  const stack: OpenEnv[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    const type = match[1]; // "begin" or "end"
    const name = match[2]; // environment name
    const from = match.index;
    const to = from + match[0].length;

    if (type === "begin") {
      stack.push({ name, from, to });
    } else if (type === "end") {
      if (stack.length === 0) {
        // Found an \end without any \begin
        diagnostics.push({
          from,
          to,
          severity: "error",
          message: `Entorno '\\end{${name}}' sin un '\\begin' correspondiente.`,
        });
      } else {
        const lastOpen = stack.pop()!;
        if (lastOpen.name !== name) {
          // Mismatched \begin and \end
          diagnostics.push({
            from,
            to,
            severity: "error",
            message: `Entorno '\\end{${name}}' no coincide con '\\begin{${lastOpen.name}}'.`,
          });
        }
      }
    }
  }

  // Any remaining items in the stack are unclosed \begins
  for (const openEnv of stack) {
    diagnostics.push({
      from: openEnv.from,
      to: openEnv.to,
      severity: "error",
      message: `Entorno '\\begin{${openEnv.name}}' nunca se cerró.`,
    });
  }

  return diagnostics;
}
