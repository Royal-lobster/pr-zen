import { useEffect, useCallback } from "react";

interface KeyboardActions {
  nextFile: () => void;
  prevFile: () => void;
  markReviewed: () => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  openCommandPalette: () => void;
  submitReview: () => void;
  showHelp: () => void;
}

export function useKeyboard(actions: KeyboardActions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const meta = e.metaKey || e.ctrlKey;

      if (e.key === "j" && !meta) {
        e.preventDefault();
        actions.nextFile();
      } else if (e.key === "k" && !meta) {
        e.preventDefault();
        actions.prevFile();
      } else if (e.key === "x" && !meta) {
        e.preventDefault();
        actions.markReviewed();
      } else if (meta && e.key === "[") {
        e.preventDefault();
        actions.toggleLeftSidebar();
      } else if (meta && e.key === "]") {
        e.preventDefault();
        actions.toggleRightSidebar();
      } else if (meta && e.key === "k") {
        e.preventDefault();
        actions.openCommandPalette();
      } else if (meta && e.key === "Enter") {
        e.preventDefault();
        actions.submitReview();
      } else if (e.key === "?" && !meta) {
        e.preventDefault();
        actions.showHelp();
      }
    },
    [actions]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
