import { useState, useCallback, useMemo } from "react";
import type { PRFile } from "../lib/api";

type OrderingMode = "bottom-up" | "top-down";

interface FileOrderState {
  mode: OrderingMode;
  toggleMode: () => void;
  orderedFiles: PRFile[];
}

function loadMode(): OrderingMode {
  try {
    const val = localStorage.getItem("pr-zen:ordering-mode");
    return val === "top-down" ? "top-down" : "bottom-up";
  } catch {
    return "bottom-up";
  }
}

export function useFileOrder(
  files: PRFile[],
  fileOrder: string[]
): FileOrderState {
  const [mode, setMode] = useState<OrderingMode>(loadMode);

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === "bottom-up" ? "top-down" : "bottom-up";
      localStorage.setItem("pr-zen:ordering-mode", next);
      return next;
    });
  }, []);

  const orderedFiles = useMemo(() => {
    const fileMap = new Map(files.map((f) => [f.path, f]));
    const baseOrder =
      fileOrder.length > 0 ? fileOrder : files.map((f) => f.path);
    const order = mode === "top-down" ? [...baseOrder].reverse() : baseOrder;
    return order
      .map((path) => fileMap.get(path))
      .filter((f): f is PRFile => f !== undefined);
  }, [files, fileOrder, mode]);

  return { mode, toggleMode, orderedFiles };
}
