import { CompletionContext, CompletionResult, snippetCompletion } from "@codemirror/autocomplete";

const LATEX_COMMANDS = [
  // Structure
  { label: "\\section", type: "keyword", info: "Section header" },
  { label: "\\subsection", type: "keyword", info: "Subsection header" },
  { label: "\\subsubsection", type: "keyword", info: "Subsubsection header" },
  { label: "\\paragraph", type: "keyword", info: "Paragraph header" },
  { label: "\\subparagraph", type: "keyword", info: "Subparagraph header" },
  { label: "\\chapter", type: "keyword", info: "Chapter header" },
  { label: "\\part", type: "keyword", info: "Part header" },

  // Environments
  snippetCompletion("\\begin{${1:env}}\n\t${2}\n\\end{${1:env}}", { label: "\\begin", type: "keyword", info: "Begin environment" }),
  { label: "\\end", type: "keyword", info: "End environment" },
  { label: "\\item", type: "keyword", info: "List item" },
  { label: "\\documentclass", type: "keyword", info: "Document class declaration" },
  { label: "\\usepackage", type: "keyword", info: "Include a package" },

  // Formatting
  { label: "\\textbf", type: "function", info: "Bold text" },
  { label: "\\textit", type: "function", info: "Italic text" },
  { label: "\\underline", type: "function", info: "Underlined text" },
  { label: "\\emph", type: "function", info: "Emphasized text" },
  { label: "\\centering", type: "keyword", info: "Center alignment" },
  { label: "\\vspace", type: "function", info: "Vertical space" },
  { label: "\\hspace", type: "function", info: "Horizontal space" },

  // Math Greek
  { label: "\\alpha", type: "variable" },
  { label: "\\beta", type: "variable" },
  { label: "\\gamma", type: "variable" },
  { label: "\\Delta", type: "variable" },
  { label: "\\delta", type: "variable" },
  { label: "\\epsilon", type: "variable" },
  { label: "\\theta", type: "variable" },
  { label: "\\lambda", type: "variable" },
  { label: "\\mu", type: "variable" },
  { label: "\\pi", type: "variable" },
  { label: "\\sigma", type: "variable" },
  { label: "\\phi", type: "variable" },
  { label: "\\omega", type: "variable" },
  { label: "\\Omega", type: "variable" },

  // Math Operators/Symbols
  { label: "\\sum", type: "keyword", info: "Summation" },
  { label: "\\int", type: "keyword", info: "Integral" },
  { label: "\\frac", type: "function", info: "Fraction" },
  { label: "\\sqrt", type: "function", info: "Square root" },
  { label: "\\approx", type: "keyword", info: "Approximately equal" },
  { label: "\\leq", type: "keyword", info: "Less than or equal" },
  { label: "\\geq", type: "keyword", info: "Greater than or equal" },
  { label: "\\neq", type: "keyword", info: "Not equal" },
  { label: "\\times", type: "keyword", info: "Multiplication sign" },
  { label: "\\div", type: "keyword", info: "Division sign" },
  { label: "\\pm", type: "keyword", info: "Plus-minus" },
  { label: "\\infty", type: "keyword", info: "Infinity" },
  { label: "\\rightarrow", type: "keyword", info: "Right arrow" },
  { label: "\\leftarrow", type: "keyword", info: "Left arrow" },
  { label: "\\Rightarrow", type: "keyword", info: "Right double arrow" },
  { label: "\\Leftarrow", type: "keyword", info: "Left double arrow" },
];

export function latexCompletions(context: CompletionContext): CompletionResult | null {
  // Match any word starting with \ or just a backslash
  const word = context.matchBefore(/\\\w*/);
  if (!word) {
    // If explicit request (e.g. Ctrl+Space), maybe we return all commands?
    // Usually it's better to only autocomplete when typing `\`
    if (context.explicit) {
      return {
        from: context.pos,
        options: LATEX_COMMANDS,
      };
    }
    return null;
  }

  // If they typed just `\`, or `\some`, show matching commands
  // word.text is what they typed so far, e.g., `\se`
  return {
    from: word.from,
    options: LATEX_COMMANDS,
    // By default, CodeMirror filters by the typed prefix
  };
}
