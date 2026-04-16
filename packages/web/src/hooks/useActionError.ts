import { useState, useCallback, useEffect } from "react";

interface ActionErrorState {
  actionError: string | null;
  setActionError: (error: string | null) => void;
  wrapAction: <T>(fn: () => Promise<T>, fallbackMsg?: string) => Promise<T | undefined>;
}

export function useActionError(dismissAfterMs = 5000): ActionErrorState {
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (actionError) {
      const t = setTimeout(() => setActionError(null), dismissAfterMs);
      return () => clearTimeout(t);
    }
  }, [actionError, dismissAfterMs]);

  const wrapAction = useCallback(
    async <T>(fn: () => Promise<T>, fallbackMsg = "Action failed"): Promise<T | undefined> => {
      try {
        return await fn();
      } catch (e) {
        setActionError(e instanceof Error ? e.message : fallbackMsg);
        return undefined;
      }
    },
    []
  );

  return { actionError, setActionError, wrapAction };
}
