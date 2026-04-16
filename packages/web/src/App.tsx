import { PRProvider, usePRContext } from "./context/PRContext";
import { FileTree } from "./components/FileTree";
import { ContextPanel } from "./components/ContextPanel";
import { ProgressBar } from "./components/ProgressBar";
import { BottomBar } from "./components/BottomBar";
import { CommandPalette, type Command } from "./components/CommandPalette";
import { ShortcutsHelp } from "./components/ShortcutsHelp";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { useSidebarState } from "./hooks/useSidebarState";
import { useReviewProgress } from "./hooks/useReviewProgress";
import { useFileOrder } from "./hooks/useFileOrder";
import { useKeyboard } from "./hooks/useKeyboard";
import { cn } from "./lib/utils";
import { useState, useCallback, useRef, useMemo, useEffect, lazy, Suspense } from "react";
import { api } from "./lib/api";
import { ArrowLeft, Loader2, AlertCircle, X } from "lucide-react";

const DiffView = lazy(() =>
  import("./components/DiffView").then((m) => ({ default: m.DiffView }))
);

function LoadingScreen() {
  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 animate-fade-in">
      <div className="relative">
        <div className="w-10 h-10 rounded-full border-2 border-zen-border" />
        <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-transparent border-t-zen-accent animate-spin" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-medium text-zen-text tracking-tight">Loading PR</span>
        <span className="text-2xs text-zen-muted font-mono">fetching data from GitHub...</span>
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 animate-fade-in">
      <div className="w-12 h-12 rounded-full bg-zen-del-bg flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-zen-del-text" />
      </div>
      <div className="flex flex-col items-center gap-1 max-w-md text-center">
        <span className="text-sm font-medium text-zen-text">Failed to load</span>
        <span className="text-xs text-zen-del-text font-mono">{message}</span>
      </div>
      <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
        Retry
      </Button>
    </div>
  );
}

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
  const [diffStyle, setDiffStyle] = useState<"unified" | "split">(() => {
    const stored = localStorage.getItem("pr-zen:diff-style");
    return stored === "split" ? "split" : "unified";
  });
  const fileRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (actionError) {
      const t = setTimeout(() => setActionError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [actionError]);

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
      try {
        const comment = await api.postInlineComment(params);
        addComment(comment);
        setPendingComment(null);
        toast.success("Comment posted");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to post comment");
      }
    },
    [addComment]
  );

  const handleReplyToComment = useCallback(
    async (commentId: number, body: string) => {
      try {
        const comment = await api.replyToComment(commentId, body);
        addComment(comment);
        toast.success("Reply posted");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to post reply");
      }
    },
    [addComment]
  );

  const handlePostComment = useCallback(
    async (body: string) => {
      try {
        const comment = await api.postComment(body);
        addComment(comment);
        toast.success("Comment posted");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to post comment");
      }
    },
    [addComment]
  );

  const handleSubmitReview = useCallback(
    async (
      event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
      body?: string
    ) => {
      try {
        await api.submitReview(event, body);
        toast.success("Review submitted");
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Failed to submit review"
        );
      }
    },
    []
  );

  const commands = useMemo<Command[]>(
    () => [
      {
        id: "toggle-left",
        label: "Toggle file tree",
        shortcut: "\u2318[",
        action: toggleLeft,
      },
      {
        id: "toggle-right",
        label: "Toggle context panel",
        shortcut: "\u2318]",
        action: toggleRight,
      },
      {
        id: "toggle-mode",
        label: `Switch to ${mode === "bottom-up" ? "top-down" : "bottom-up"} order`,
        action: toggleMode,
      },
      {
        id: "toggle-diff-style",
        label: "Toggle split/unified diff",
        action: toggleDiffStyle,
      },
      {
        id: "shortcuts",
        label: "Show keyboard shortcuts",
        shortcut: "?",
        action: () => setHelpOpen(true),
      },
    ],
    [toggleLeft, toggleRight, toggleMode, mode, toggleDiffStyle]
  );

  useKeyboard({
    nextFile: () => navigateFile(1),
    prevFile: () => navigateFile(-1),
    markReviewed: () => {
      if (currentFile) toggleReviewed(currentFile);
    },
    toggleLeftSidebar: toggleLeft,
    toggleRightSidebar: toggleRight,
    openCommandPalette: () => setCommandPaletteOpen(true),
    submitReview: () => {},
    showHelp: () => setHelpOpen(true),
  });

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorScreen message={error ?? "Failed to load PR"} />;

  return (
    <div className="h-screen flex flex-col zen-noise">
      <ProgressBar
        reviewedCount={reviewedCount}
        totalFiles={orderedFiles.length}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar -- File Tree */}
        <div
          className={cn(
            "shrink-0 border-r border-zen-border bg-zen-surface overflow-hidden transition-sidebar",
            leftOpen ? "w-64" : "w-0"
          )}
        >
          {leftOpen && (
            <div className="w-64 h-full animate-slide-in-left">
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
        </div>

        {!leftOpen && (
          <div
            onClick={toggleLeft}
            className="w-1 bg-zen-border hover:bg-zen-accent cursor-pointer transition-colors duration-200 shrink-0"
            title="Show file tree (\u2318[)"
          />
        )}

        {/* Center -- Diff View */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeCommit && (
            <div className="flex items-center gap-3 px-4 py-2 bg-zen-surface/80 backdrop-blur-sm border-b border-zen-border">
              <Button variant="ghost" size="sm" onClick={() => setActiveCommit(null)}>
                <ArrowLeft className="w-3 h-3" />
                Back to full diff
              </Button>
              <Badge variant="accent">
                {activeCommit.slice(0, 7)}
              </Badge>
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <Suspense fallback={
              <div className="flex-1 flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 animate-spin text-zen-muted" />
              </div>
            }>
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
            </Suspense>
          </div>
        </div>

        {/* Right Sidebar -- Context Panel */}
        <div
          className={cn(
            "shrink-0 border-l border-zen-border bg-zen-surface overflow-hidden transition-sidebar",
            rightOpen ? "w-80" : "w-0"
          )}
        >
          {rightOpen && (
            <div className="w-80 h-full animate-slide-in-right">
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
        </div>

        {!rightOpen && (
          <div
            onClick={toggleRight}
            className="w-1 bg-zen-border hover:bg-zen-accent cursor-pointer transition-colors duration-200 shrink-0"
            title="Show context panel (\u2318])"
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

      {/* Error toast */}
      {actionError && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-zen-surface border border-zen-del-border rounded-lg shadow-overlay">
            <AlertCircle className="w-3.5 h-3.5 text-zen-del-text shrink-0" />
            <span className="text-xs text-zen-del-text font-mono">{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              className="text-zen-muted hover:text-zen-text transition-colors ml-1"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function App() {
  return (
    <PRProvider>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </PRProvider>
  );
}
