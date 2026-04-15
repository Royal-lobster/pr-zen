import { useState, useCallback } from "react";

interface SidebarState {
  leftOpen: boolean;
  rightOpen: boolean;
  toggleLeft: () => void;
  toggleRight: () => void;
}

function loadFromStorage(key: string, fallback: boolean): boolean {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val === "true" : fallback;
  } catch {
    return fallback;
  }
}

export function useSidebarState(): SidebarState {
  const [leftOpen, setLeftOpen] = useState(() =>
    loadFromStorage("pr-zen:left-sidebar", true)
  );
  const [rightOpen, setRightOpen] = useState(() =>
    loadFromStorage("pr-zen:right-sidebar", true)
  );

  const toggleLeft = useCallback(() => {
    setLeftOpen((prev) => {
      localStorage.setItem("pr-zen:left-sidebar", String(!prev));
      return !prev;
    });
  }, []);

  const toggleRight = useCallback(() => {
    setRightOpen((prev) => {
      localStorage.setItem("pr-zen:right-sidebar", String(!prev));
      return !prev;
    });
  }, []);

  return { leftOpen, rightOpen, toggleLeft, toggleRight };
}
