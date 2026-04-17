import { useState, useCallback, useEffect, useRef } from "react";
import { api, type PRFile } from "../lib/api";

const STORAGE_PREFIX = "pr-zen:v1:viewed:";
const MAX_STORED_PRS = 20;

interface ViewedState {
  toggleViewed: (path: string) => Promise<void>;
  isViewed: (path: string) => boolean;
  viewedCount: number;
}

function storageKey(prKey: string | undefined) {
  return `${STORAGE_PREFIX}${prKey ?? "unknown"}`;
}

function loadCache(prKey: string | undefined): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(prKey));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveCache(prKey: string | undefined, set: Set<string>) {
  try {
    localStorage.setItem(storageKey(prKey), JSON.stringify([...set]));
    pruneOldKeys();
  } catch {
    // ignore
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

export function useViewedState(
  prKey: string | undefined,
  files: PRFile[],
  onError: (message: string) => void
): ViewedState {
  const [viewed, setViewed] = useState<Set<string>>(() => loadCache(prKey));
  const seededFromServer = useRef(false);

  useEffect(() => {
    if (seededFromServer.current) return;
    if (files.length === 0) return;
    const next = new Set<string>();
    for (const f of files) {
      if (f.viewed) next.add(f.path);
    }
    setViewed(next);
    saveCache(prKey, next);
    seededFromServer.current = true;
  }, [files, prKey]);

  useEffect(() => {
    seededFromServer.current = false;
    setViewed(loadCache(prKey));
  }, [prKey]);

  const toggleViewed = useCallback(
    async (path: string) => {
      const currentlyViewed = viewed.has(path);
      const nextValue = !currentlyViewed;
      setViewed((prev) => {
        const next = new Set(prev);
        if (nextValue) next.add(path);
        else next.delete(path);
        saveCache(prKey, next);
        return next;
      });
      try {
        await api.setViewed(path, nextValue);
      } catch (e) {
        setViewed((prev) => {
          const next = new Set(prev);
          if (currentlyViewed) next.add(path);
          else next.delete(path);
          saveCache(prKey, next);
          return next;
        });
        onError(
          e instanceof Error ? e.message : "Failed to sync viewed state"
        );
      }
    },
    [viewed, prKey, onError]
  );

  const isViewed = useCallback((path: string) => viewed.has(path), [viewed]);

  return { toggleViewed, isViewed, viewedCount: viewed.size };
}
