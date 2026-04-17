import { useState, useCallback } from "react";

type DiffStyle = "unified" | "split";

interface DiffPrefs {
  diffStyle: DiffStyle;
  wordWrap: boolean;
}

interface DiffPrefsState extends DiffPrefs {
  toggleDiffStyle: () => void;
  toggleWordWrap: () => void;
}

const STORAGE_KEY = "pr-zen:v1:diff-prefs";
const LEGACY_KEY = "pr-zen:v1:diff-style";

function loadPrefs(): DiffPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DiffPrefs>;
      return {
        diffStyle: parsed.diffStyle === "split" ? "split" : "unified",
        wordWrap: parsed.wordWrap === true,
      };
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy === "split" || legacy === "unified") {
      return { diffStyle: legacy, wordWrap: false };
    }
  } catch {
    // ignore
  }
  return { diffStyle: "unified", wordWrap: false };
}

function savePrefs(prefs: DiffPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export function useDiffPrefs(): DiffPrefsState {
  const [prefs, setPrefs] = useState<DiffPrefs>(loadPrefs);

  const toggleDiffStyle = useCallback(() => {
    setPrefs((prev) => {
      const next: DiffPrefs = {
        ...prev,
        diffStyle: prev.diffStyle === "unified" ? "split" : "unified",
      };
      savePrefs(next);
      return next;
    });
  }, []);

  const toggleWordWrap = useCallback(() => {
    setPrefs((prev) => {
      const next: DiffPrefs = { ...prev, wordWrap: !prev.wordWrap };
      savePrefs(next);
      return next;
    });
  }, []);

  return { ...prefs, toggleDiffStyle, toggleWordWrap };
}
