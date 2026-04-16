import { useState, useCallback } from "react";

type DiffStyle = "unified" | "split";

interface DiffStyleState {
  diffStyle: DiffStyle;
  toggleDiffStyle: () => void;
}

function loadDiffStyle(): DiffStyle {
  try {
    const stored = localStorage.getItem("pr-zen:v1:diff-style");
    return stored === "split" ? "split" : "unified";
  } catch {
    return "unified";
  }
}

export function useDiffStyle(): DiffStyleState {
  const [diffStyle, setDiffStyle] = useState<DiffStyle>(loadDiffStyle);

  const toggleDiffStyle = useCallback(() => {
    setDiffStyle((prev) => {
      const next = prev === "unified" ? "split" : "unified";
      localStorage.setItem("pr-zen:v1:diff-style", next);
      return next;
    });
  }, []);

  return { diffStyle, toggleDiffStyle };
}
