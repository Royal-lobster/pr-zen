import { PRProvider, usePRContext } from "./context/PRContext";
import { FileTree } from "./components/FileTree";
import { ContextPanel } from "./components/ContextPanel";
import { ProgressBar } from "./components/ProgressBar";
import { BottomBar } from "./components/BottomBar";
import { useSidebarState } from "./hooks/useSidebarState";
import { useReviewProgress } from "./hooks/useReviewProgress";
import { useFileOrder } from "./hooks/useFileOrder";
import { DiffView } from "./components/DiffView";
import { useState, useCallback, useRef } from "react";
import { api } from "./lib/api";

function AppContent() {
  const {
    data,
    loading,
    error,
    currentFiles,
    currentFileOrder,
    activeCommit,
    setActiveCommit,
    addComment,
  } = usePRContext();
  const { leftOpen, rightOpen, toggleLeft, toggleRight } = useSidebarState();
  const { mode, toggleMode, orderedFiles } = useFileOrder(
    currentFiles,
    currentFileOrder
  );
  const prKey = data ? `${data.pr.number}` : undefined;
  const { isReviewed, toggleReviewed, reviewedCount } =
    useReviewProgress(prKey);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const fileRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const handleFileRef = useCallback(
    (path: string, el: HTMLDivElement | null) => {
      if (el) {
        fileRefs.current.set(path, el);
      } else {
        fileRefs.current.delete(path);
      }
    },
    []
  );

  const handleFileClick = useCallback((path: string) => {
    setCurrentFile(path);
    const el = fileRefs.current.get(path);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleGutterClick = useCallback(
    (params: { path: string; line: number; side: "LEFT" | "RIGHT" }) => {
      // Will be fully wired in Phase 4 with inline comment form
      console.log("Start comment:", params);
    },
    []
  );

  const handleReplyToComment = useCallback(
    async (commentId: number, body: string) => {
      const comment = await api.replyToComment(commentId, body);
      addComment(comment);
    },
    [addComment]
  );

  const handlePostComment = useCallback(
    async (body: string) => {
      const comment = await api.postComment(body);
      addComment(comment);
    },
    [addComment]
  );

  const handleSubmitReview = useCallback(
    async (
      event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
      body?: string
    ) => {
      await api.submitReview(event, body);
    },
    []
  );

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-zen-muted text-sm">Loading PR...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-zen-del-text text-sm">
          {error ?? "Failed to load PR"}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <ProgressBar
        reviewedCount={reviewedCount}
        totalFiles={orderedFiles.length}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar — File Tree */}
        {leftOpen && (
          <div className="w-64 shrink-0 border-r border-zen-border bg-zen-surface overflow-hidden">
            <FileTree
              files={orderedFiles}
              currentFile={currentFile}
              isReviewed={isReviewed}
              onToggleReviewed={toggleReviewed}
              onFileClick={handleFileClick}
              mode={mode}
              onToggleMode={toggleMode}
            />
          </div>
        )}

        {/* Left edge indicator when collapsed */}
        {!leftOpen && (
          <div
            onClick={toggleLeft}
            className="w-1 bg-zen-border hover:bg-zen-accent cursor-pointer transition-colors shrink-0"
            title="Show file tree (Cmd+[)"
          />
        )}

        {/* Center — Diff View */}
        <div className="flex-1 overflow-hidden">
          {activeCommit && (
            <div className="sticky top-0 z-10 px-4 py-2 bg-zen-surface border-b border-zen-border">
              <button
                onClick={() => setActiveCommit(null)}
                className="text-xs text-zen-accent hover:text-zen-accent/80"
              >
                &larr; Back to full diff
              </button>
              <span className="text-xs text-zen-muted ml-2">
                Viewing commit {activeCommit.slice(0, 7)}
              </span>
            </div>
          )}
          <DiffView
            files={orderedFiles}
            comments={data.comments}
            onGutterClick={handleGutterClick}
            onReplyToComment={handleReplyToComment}
            fileRef={handleFileRef}
          />
        </div>

        {/* Right Sidebar — Context Panel */}
        {rightOpen && (
          <div className="w-80 shrink-0 border-l border-zen-border bg-zen-surface overflow-hidden">
            <ContextPanel
              pr={data.pr}
              comments={data.comments}
              commits={data.commits}
              activeCommit={activeCommit}
              onSelectCommit={setActiveCommit}
              onPostComment={handlePostComment}
            />
          </div>
        )}

        {/* Right edge indicator when collapsed */}
        {!rightOpen && (
          <div
            onClick={toggleRight}
            className="w-1 bg-zen-border hover:bg-zen-accent cursor-pointer transition-colors shrink-0"
            title="Show context panel (Cmd+])"
          />
        )}
      </div>

      <BottomBar onSubmitReview={handleSubmitReview} />
    </div>
  );
}

export function App() {
  return (
    <PRProvider>
      <AppContent />
    </PRProvider>
  );
}
