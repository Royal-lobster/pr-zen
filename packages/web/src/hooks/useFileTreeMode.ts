import { useState, useCallback } from "react";

type FileTreeMode = "flat" | "tree";

interface FileTreeModeState {
  treeMode: FileTreeMode;
  toggleTreeMode: () => void;
}

const STORAGE_KEY = "pr-zen:v1:file-tree-mode";

function loadMode(): FileTreeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "tree" ? "tree" : "flat";
  } catch {
    return "flat";
  }
}

export function useFileTreeMode(): FileTreeModeState {
  const [treeMode, setTreeMode] = useState<FileTreeMode>(loadMode);

  const toggleTreeMode = useCallback(() => {
    setTreeMode((prev) => {
      const next = prev === "flat" ? "tree" : "flat";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return { treeMode, toggleTreeMode };
}
