import { useState, useCallback, useEffect } from "react";

const STORAGE_PREFIX = "pr-zen:v1:reviewed:";
const MAX_STORED_PRS = 20;

interface ReviewProgress {
  reviewed: Set<string>;
  toggleReviewed: (path: string) => void;
  isReviewed: (path: string) => boolean;
  reviewedCount: number;
}

function getStorageKey(prKey?: string): string {
  return `${STORAGE_PREFIX}${prKey ?? "unknown"}`;
}

function loadReviewed(prKey?: string): Set<string> {
  try {
    const raw = localStorage.getItem(getStorageKey(prKey));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveReviewed(reviewed: Set<string>, prKey?: string) {
  try {
    localStorage.setItem(
      getStorageKey(prKey),
      JSON.stringify([...reviewed])
    );
    pruneOldKeys();
  } catch {
    // localStorage full or unavailable
  }
}

function pruneOldKeys() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(STORAGE_PREFIX)) keys.push(k);
    }
    if (keys.length > MAX_STORED_PRS) {
      keys.sort();
      const toRemove = keys.slice(0, keys.length - MAX_STORED_PRS);
      for (const k of toRemove) localStorage.removeItem(k);
    }
  } catch {
    // ignore
  }
}

export function useReviewProgress(prKey?: string): ReviewProgress {
  const [reviewed, setReviewed] = useState(() => loadReviewed(prKey));

  useEffect(() => {
    setReviewed(loadReviewed(prKey));
  }, [prKey]);

  const toggleReviewed = useCallback(
    (path: string) => {
      setReviewed((prev) => {
        const next = new Set(prev);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
        }
        saveReviewed(next, prKey);
        return next;
      });
    },
    [prKey]
  );

  const isReviewed = useCallback(
    (path: string) => reviewed.has(path),
    [reviewed]
  );

  return { reviewed, toggleReviewed, isReviewed, reviewedCount: reviewed.size };
}
