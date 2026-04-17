import { useEffect, useRef } from "react";

interface KeyboardActions {
  nextFile: () => void;
  prevFile: () => void;
  markReviewed: () => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  openCommandPalette: () => void;
  submitReview: () => void;
  showHelp: () => void;
  toggleDiffStyle: () => void;
  toggleWordWrap: () => void;
}

export function useKeyboard(actions: KeyboardActions) {
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const meta = e.metaKey || e.ctrlKey;
      const a = actionsRef.current;

      if (e.key === "j" && !meta) {
        e.preventDefault();
        a.nextFile();
      } else if (e.key === "k" && !meta) {
        e.preventDefault();
        a.prevFile();
      } else if (e.key === "x" && !meta) {
        e.preventDefault();
        a.markReviewed();
      } else if (meta && e.key === "[") {
        e.preventDefault();
        a.toggleLeftSidebar();
      } else if (meta && e.key === "]") {
        e.preventDefault();
        a.toggleRightSidebar();
      } else if (meta && e.key === "k") {
        e.preventDefault();
        a.openCommandPalette();
      } else if (meta && e.key === "Enter") {
        e.preventDefault();
        a.submitReview();
      } else if (e.key === "?" && !meta) {
        e.preventDefault();
        a.showHelp();
      } else if (e.key === "w" && !meta) {
        e.preventDefault();
        a.toggleWordWrap();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
