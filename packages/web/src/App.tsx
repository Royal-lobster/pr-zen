import { PRProvider, usePRContext } from "./context/PRContext";
import { FileTree } from "./components/FileTree";
import { ContextPanel } from "./components/ContextPanel";
import { ProgressBar } from "./components/ProgressBar";
import { BottomBar } from "./components/BottomBar";
import { DiffView } from "./components/DiffView";
import { CommandPalette, type Command } from "./components/CommandPalette";
import { ShortcutsHelp } from "./components/ShortcutsHelp";
import { useSidebarState } from "./hooks/useSidebarState";
import { useReviewProgress } from "./hooks/useReviewProgress";
import { useFileOrder } from "./hooks/useFileOrder";
import { useKeyboard } from "./hooks/useKeyboard";
import { useState, useCallback, useRef, useMemo } from "react";
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
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [pendingComment, setPendingComment] = useState<{
    path: string;
    line: number;
    side: string;
  } | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const fileRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const currentFile = orderedFiles[currentFileIndex]?.path ?? null;

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

  const scrollToFile = useCallback((path: string) => {
    const el = fileRefs.current.get(path);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleFileClick = useCallback(
    (path: string) => {
      const idx = orderedFiles.findIndex((f) => f.path === path);
      if (idx >= 0) setCurrentFileIndex(idx);
      scrollToFile(path);
    },
    [orderedFiles, scrollToFile]
  );

  const navigateFile = useCallback(
    (delta: number) => {
      setCurrentFileIndex((prev) => {
        const next = Math.max(
          0,
          Math.min(prev + delta, orderedFiles.length - 1)
        );
        const file = orderedFiles[next];
        if (file) scrollToFile(file.path);
        return next;
      });
    },
    [orderedFiles, scrollToFile]
  );

  const handleGutterClick = useCallback(
    (params: { path: string; line: number; side: "LEFT" | "RIGHT" }) => {
      setPendingComment({
        path: params.path,
        line: params.line,
        side: params.side,
      });
    },
    []
  );

  const handleSubmitInlineComment = useCallback(
    async (params: {
      body: string;
      path: string;
      line: number;
      side: string;
    }) => {
      const comment = await api.postInlineComment(params);
      addComment(comment);
      setPendingComment(null);
    },
    [addComment]
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

  const commands = useMemo<Command[]>(
    () => [
      {
        id: "toggle-left",
        label: "Toggle file tree",
        shortcut: "Cmd+[",
        action: toggleLeft,
      },
      {
        id: "toggle-right",
        label: "Toggle context panel",
        shortcut: "Cmd+]",
        action: toggleRight,
      },
      {
        id: "toggle-mode",
        label: `Switch to ${mode === "bottom-up" ? "top-down" : "bottom-up"} order`,
        action: toggleMode,
      },
      {
        id: "shortcuts",
        label: "Show keyboard shortcuts",
        shortcut: "?",
        action: () => setHelpOpen(true),
      },
    ],
    [toggleLeft, toggleRight, toggleMode, mode]
  );

  useKeyboard(
    useMemo(
      () => ({
        nextFile: () => navigateFile(1),
        prevFile: () => navigateFile(-1),
        markReviewed: () => {
          if (currentFile) toggleReviewed(currentFile);
        },
        startComment: () => {
          // Use gutter utility button to start inline comments
        },
        toggleLeftSidebar: toggleLeft,
        toggleRightSidebar: toggleRight,
        openCommandPalette: () => setCommandPaletteOpen(true),
        submitReview: () => handleSubmitReview("APPROVE"),
        showHelp: () => setHelpOpen(true),
      }),
      [
        navigateFile,
        currentFile,
        toggleReviewed,
        toggleLeft,
        toggleRight,
        handleSubmitReview,
      ]
    )
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
            pendingComment={pendingComment}
            onGutterClick={handleGutterClick}
            onSubmitInlineComment={handleSubmitInlineComment}
            onCancelComment={() => setPendingComment(null)}
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

        {!rightOpen && (
          <div
            onClick={toggleRight}
            className="w-1 bg-zen-border hover:bg-zen-accent cursor-pointer transition-colors shrink-0"
            title="Show context panel (Cmd+])"
          />
        )}
      </div>

      <BottomBar onSubmitReview={handleSubmitReview} />

      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        files={orderedFiles}
        onFileSelect={handleFileClick}
        commands={commands}
      />

      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
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
