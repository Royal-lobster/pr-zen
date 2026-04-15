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
import { Toaster, toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Columns2,
  Rows2,
} from "lucide-react";

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

  const toggleDiffStyle = useCallback(() => {
    setDiffStyle((prev) => {
      const next = prev === "unified" ? "split" : "unified";
      localStorage.setItem("pr-zen:diff-style", next);
      return next;
    });
  }, []);

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

  useKeyboard(
    useMemo(
      () => ({
        nextFile: () => navigateFile(1),
        prevFile: () => navigateFile(-1),
        markReviewed: () => {
          if (currentFile) toggleReviewed(currentFile);
        },
        toggleLeftSidebar: toggleLeft,
        toggleRightSidebar: toggleRight,
        openCommandPalette: () => setCommandPaletteOpen(true),
        submitReview: () => {
          // Removed: Cmd+Enter should not auto-approve. Use the Submit button.
        },
        showHelp: () => setHelpOpen(true),
        toggleDiffStyle,
      }),
      [
        navigateFile,
        currentFile,
        toggleReviewed,
        toggleLeft,
        toggleRight,
        toggleDiffStyle,
      ]
    )
  );

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading PR...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-destructive text-sm">
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
        {/* Left Sidebar -- File Tree */}
        {leftOpen && (
          <div className="w-64 shrink-0 border-r border-border bg-card overflow-hidden flex flex-col">
            <div className="flex items-center justify-end px-2 py-1 border-b border-border">
              <button
                onClick={toggleLeft}
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                title="Hide file tree (Cmd+[)"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
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
          </div>
        )}

        {!leftOpen && (
          <div className="flex flex-col items-center py-2 border-r border-border bg-card">
            <button
              onClick={toggleLeft}
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
              title="Show file tree (Cmd+[)"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Center -- Diff View */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeCommit && (
            <div className="sticky top-0 z-10 px-4 py-2 bg-card border-b border-border">
              <button
                onClick={() => setActiveCommit(null)}
                className="text-xs text-primary hover:text-primary/80"
              >
                &larr; Back to full diff
              </button>
              <span className="text-xs text-muted-foreground ml-2">
                Viewing commit {activeCommit.slice(0, 7)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-end px-4 py-1 border-b border-border bg-card">
            <button
              onClick={toggleDiffStyle}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title={`Switch to ${diffStyle === "unified" ? "split" : "unified"} diff`}
            >
              {diffStyle === "unified" ? (
                <Columns2 className="h-3.5 w-3.5" />
              ) : (
                <Rows2 className="h-3.5 w-3.5" />
              )}
              {diffStyle === "unified" ? "Split" : "Unified"}
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            <DiffView
              files={orderedFiles}
              comments={data.comments}
              pendingComment={pendingComment}
              onGutterClick={handleGutterClick}
              onSubmitInlineComment={handleSubmitInlineComment}
              onCancelComment={() => setPendingComment(null)}
              onReplyToComment={handleReplyToComment}
              fileRef={handleFileRef}
              diffStyle={diffStyle}
            />
          </div>
        </div>

        {/* Right Sidebar -- Context Panel */}
        {rightOpen && (
          <div className="w-80 shrink-0 border-l border-border bg-card overflow-hidden flex flex-col">
            <div className="flex items-center justify-start px-2 py-1 border-b border-border">
              <button
                onClick={toggleRight}
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                title="Hide context panel (Cmd+])"
              >
                <PanelRightClose className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ContextPanel
                pr={data.pr}
                comments={data.comments}
                commits={data.commits}
                activeCommit={activeCommit}
                onSelectCommit={setActiveCommit}
                onPostComment={handlePostComment}
              />
            </div>
          </div>
        )}

        {!rightOpen && (
          <div className="flex flex-col items-center py-2 border-l border-border bg-card">
            <button
              onClick={toggleRight}
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
              title="Show context panel (Cmd+])"
            >
              <PanelRightOpen className="h-4 w-4" />
            </button>
          </div>
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

      <Toaster theme="dark" />
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
