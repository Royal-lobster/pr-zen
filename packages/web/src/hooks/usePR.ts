import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  api,
  type PRPayload,
  type PRFile,
  type PRComment,
} from "../lib/api";

export interface PRState {
  data: PRPayload | null;
  loading: boolean;
  error: string | null;
  currentFiles: PRFile[];
  currentFileOrder: string[];
  activeCommit: string | null;
  setActiveCommit: (sha: string | null) => void;
  addComment: (comment: PRComment) => void;
  refresh: () => Promise<void>;
}

export function usePR(): PRState {
  const [data, setData] = useState<PRPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCommit, setActiveCommitState] = useState<string | null>(null);
  const [commitFiles, setCommitFiles] = useState<PRFile[] | null>(null);
  const [commitFileOrder, setCommitFileOrder] = useState<string[] | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dataLoaded = useRef(false);
  const latestSha = useRef<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = await api.getPR();
      setData(payload);
      dataLoaded.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch PR");
    } finally {
      setLoading(false);
    }
  }, []);

  const setActiveCommit = useCallback(async (sha: string | null) => {
    latestSha.current = sha;
    setActiveCommitState(sha);
    if (!sha) {
      setCommitFiles(null);
      setCommitFileOrder(null);
      return;
    }
    try {
      const { files, fileOrder } = await api.getDiff(sha);
      if (latestSha.current !== sha) return;
      setCommitFiles(files);
      setCommitFileOrder(fileOrder);
    } catch (e) {
      if (latestSha.current === sha) {
        setError(
          e instanceof Error ? e.message : "Failed to fetch commit diff"
        );
      }
    }
  }, []);

  const addComment = useCallback((comment: PRComment) => {
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, comments: [...prev.comments, comment] };
    });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      if (!dataLoaded.current) return;
      try {
        const { comments: newComments } = await api.poll();
        if (newComments.length > 0) {
          setData((prev) => {
            if (!prev) return prev;
            const existingIds = new Set(prev.comments.map((c) => c.id));
            const unique = newComments.filter((c) => !existingIds.has(c.id));
            if (unique.length === 0) return prev;
            return { ...prev, comments: [...prev.comments, ...unique] };
          });
        }
      } catch {
        // Silently fail polling
      }
    }, 30_000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const currentFiles = useMemo(
    () => commitFiles ?? data?.files ?? [],
    [commitFiles, data?.files]
  );
  const currentFileOrder = useMemo(
    () => commitFileOrder ?? data?.fileOrder ?? [],
    [commitFileOrder, data?.fileOrder]
  );

  return {
    data,
    loading,
    error,
    currentFiles,
    currentFileOrder,
    activeCommit,
    setActiveCommit,
    addComment,
    refresh: fetchData,
  };
}
