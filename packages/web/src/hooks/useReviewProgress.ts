import { useState, useCallback } from "react";

interface ReviewProgress {
  reviewed: Set<string>;
  toggleReviewed: (path: string) => void;
  isReviewed: (path: string) => boolean;
  reviewedCount: number;
}

function getStorageKey(prUrl?: string): string {
  return `pr-zen:reviewed:${prUrl ?? "unknown"}`;
}

function loadReviewed(prUrl?: string): Set<string> {
  try {
    const raw = localStorage.getItem(getStorageKey(prUrl));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveReviewed(reviewed: Set<string>, prUrl?: string) {
  try {
    localStorage.setItem(
      getStorageKey(prUrl),
      JSON.stringify([...reviewed])
    );
  } catch {
    // localStorage full or unavailable
  }
}

export function useReviewProgress(prUrl?: string): ReviewProgress {
  const [reviewed, setReviewed] = useState(() => loadReviewed(prUrl));

  const toggleReviewed = useCallback(
    (path: string) => {
      setReviewed((prev) => {
        const next = new Set(prev);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
        }
        saveReviewed(next, prUrl);
        return next;
      });
    },
    [prUrl]
  );

  const isReviewed = useCallback(
    (path: string) => reviewed.has(path),
    [reviewed]
  );

  return { reviewed, toggleReviewed, isReviewed, reviewedCount: reviewed.size };
}
