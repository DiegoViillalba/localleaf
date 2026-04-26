import { EditorState, EditorSelection, ChangeSpec } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

/**
 * Toggles LaTeX comments (%) for the selected lines.
 */
export function toggleLatexComment(view: EditorView): boolean {
  const { state } = view;
  const changes: ChangeSpec[] = [];
  
  // Get all lines touched by selections
  const lines = new Set<number>();
  for (const range of state.selection.ranges) {
    const startLine = state.doc.lineAt(range.from).number;
    const endLine = state.doc.lineAt(range.to).number;
    for (let i = startLine; i <= endLine; i++) {
      lines.add(i);
    }
  }

  const sortedLineNumbers = Array.from(lines).sort((a, b) => a - b);
  const lineObjects = sortedLineNumbers.map(num => state.doc.line(num));
  
  const nonEmptyLines = lineObjects.filter(line => line.text.trim().length > 0);
  if (nonEmptyLines.length === 0 && lineObjects.length > 0) {
     // If only empty lines are selected, we still might want to toggle them
     nonEmptyLines.push(...lineObjects);
  }

  // Determine if we should uncomment or comment
  const shouldUncomment = nonEmptyLines.length > 0 && nonEmptyLines.every(line => /^(\s*)%/.test(line.text));

  for (const line of lineObjects) {
    const text = line.text;
    if (shouldUncomment) {
      const match = text.match(/^(\s*)% ?/);
      if (match) {
        const removeFrom = line.from + match[1].length;
        const removeTo = removeFrom + match[0].length - match[1].length;
        changes.push({ from: removeFrom, to: removeTo, insert: "" });
      }
    } else {
      const indent = text.match(/^\s*/)?.[0] ?? "";
      const insertAt = line.from + indent.length;
      changes.push({ from: insertAt, insert: "% " });
    }
  }

  if (changes.length > 0) {
    view.dispatch({ changes });
    return true;
  }

  return false;
}

/**
 * Wraps selection with a LaTeX command like \textbf{...}
 */
export function wrapSelectionWithLatexCommand(commandName: string) {
  return (view: EditorView): boolean => {
    const { state } = view;
    
    const newSelection = state.changeByRange(range => {
      const selectedText = state.sliceDoc(range.from, range.to);
      const insert = `\\${commandName}{${selectedText}}`;
      
      return {
        changes: [{ from: range.from, to: range.to, insert }],
        range: range.empty 
          ? EditorSelection.cursor(range.from + commandName.length + 2) // inside {}
          : EditorSelection.range(range.from + commandName.length + 2, range.from + commandName.length + 2 + selectedText.length)
      };
    });

    view.dispatch(state.update(newSelection, {
      scrollIntoView: true,
      userEvent: "input.latex.command"
    }));

    return true;
  };
}

/**
 * Wraps selection with a LaTeX environment or inserts a snippet if empty.
 */
export function wrapWithLatexEnvironment(envName: string) {
  return (view: EditorView): boolean => {
    const { state } = view;
    
    const newSelection = state.changeByRange(range => {
      const selectedText = state.sliceDoc(range.from, range.to);
      if (selectedText.trim()) {
        const insert = `\\begin{${envName}}\n${selectedText}\n\\end{${envName}}`;
        return {
          changes: [{ from: range.from, to: range.to, insert }],
          range: EditorSelection.range(range.from + `\\begin{${envName}}\n`.length, range.from + `\\begin{${envName}}\n`.length + selectedText.length)
        };
      } else {
        const insert = `\\begin{${envName}}\n  \n\\end{${envName}}`;
        const newPos = range.from + `\\begin{${envName}}\n  `.length;
        return {
          changes: [{ from: range.from, to: range.to, insert }],
          range: EditorSelection.cursor(newPos)
        };
      }
    });

    view.dispatch(state.update(newSelection, {
      scrollIntoView: true,
      userEvent: "input.latex.environment"
    }));

    return true;
  };
}

/**
 * TODO: Implement navigation between compilation errors.
 */
export function goToNextError(view: EditorView): boolean {
  console.log("Next error navigation not yet implemented");
  return false;
}

export function goToPrevError(view: EditorView): boolean {
  console.log("Previous error navigation not yet implemented");
  return false;
}
