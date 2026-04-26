import { useState, useEffect, useMemo } from "react";
import { useAppStore } from "../store/useAppStore";
import { readFile, listDirectory } from "../lib/tauri";
import { parseBibFile, parseBibReferences, BibEntry } from "../lib/parseBib";

export function useBibEntries(): BibEntry[] {
  const { content, activeFilePath, rootFilePath } = useAppStore();
  const [entries, setEntries] = useState<BibEntry[]>([]);

  // Derive bib file names synchronously — only changes when \bibliography / \addbibresource changes.
  const bibRefs = useMemo(() => parseBibReferences(content), [content]);
  // Stable key so the effect only fires when references actually change.
  const bibRefsKey = bibRefs.join(",");

  useEffect(() => {
    const targetPath = rootFilePath ?? activeFilePath;
    if (!targetPath) {
      setEntries([]);
      return;
    }

    let cancelled = false;

    const dir = targetPath.substring(0, targetPath.lastIndexOf("/"));

    async function load() {
      const allEntries: BibEntry[] = [];

      if (bibRefs.length > 0) {
        for (const ref of bibRefs) {
          const bibPath = ref.endsWith(".bib") ? `${dir}/${ref}` : `${dir}/${ref}.bib`;
          try {
            const text = await readFile(bibPath);
            allEntries.push(...parseBibFile(text));
          } catch {
            // File not found or unreadable — skip silently
          }
        }
      } else {
        // No explicit refs — fall back to any .bib file in the same directory
        try {
          const files = await listDirectory(dir);
          for (const file of files) {
            if (!file.is_dir && file.extension === "bib") {
              try {
                const text = await readFile(file.path);
                allEntries.push(...parseBibFile(text));
              } catch {}
            }
          }
        } catch {}
      }

      if (!cancelled) setEntries(allEntries);
    }

    load();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bibRefsKey, activeFilePath, rootFilePath]);

  return entries;
}
