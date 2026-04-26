import { CompletionContext, CompletionResult, Completion } from "@codemirror/autocomplete";
import { BibEntry } from "../../lib/parseBib";

// Matches all common cite variants, with or without * modifier
const CITE_RE =
  /\\(?:cite|citep|citet|citealt|citealp|citeauthor|citeyear|citenum|nocite|parencite|textcite|autocite|footcite|fullcite)\*?\{[^}]*/;

export function makeCitationSource(entriesRef: { current: BibEntry[] }) {
  return function citationCompletions(context: CompletionContext): CompletionResult | null {
    const before = context.matchBefore(CITE_RE);
    if (!before && !context.explicit) return null;

    const entries = entriesRef.current;
    if (entries.length === 0) return null;

    // Determine `from`: position right after the last { or , in the matched text
    let from: number;
    if (before) {
      const text = before.text;
      const pivot = Math.max(text.lastIndexOf("{"), text.lastIndexOf(","));
      from = before.from + pivot + 1;
      // Skip leading space after comma
      const slice = context.state.doc.sliceString(from, from + 1);
      if (slice === " ") from++;
    } else {
      from = context.pos;
    }

    const options: Completion[] = entries.map((entry) => {
      // Build a concise detail: "Surname, Year"
      const detailParts: string[] = [];
      if (entry.author) {
        const firstAuthor = entry.author.split(/\s+and\s+/i)[0].trim();
        const surname = firstAuthor.includes(",")
          ? firstAuthor.split(",")[0].trim()
          : firstAuthor.split(/\s+/).pop() ?? firstAuthor;
        detailParts.push(surname);
      }
      if (entry.year) detailParts.push(entry.year);

      return {
        label: entry.key,
        type: "variable",
        detail: detailParts.join(", ") || entry.type,
        info: entry.title,
        boost: 2, // float above generic latex commands
      };
    });

    return {
      from,
      options,
      // Keep completing as long as we are still inside the braces
      validFor: /^[^},]*$/,
    };
  };
}
