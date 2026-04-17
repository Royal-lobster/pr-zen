import { PRProvider, usePRContext } from "./context/PRContext";
import { FileTree } from "./components/FileTree";
import { ContextPanel } from "./components/ContextPanel";
import { ProgressBar } from "./components/ProgressBar";
import { BottomBar } from "./components/BottomBar";
import { CommandPalette, type Command } from "./components/CommandPalette";
import { ShortcutsHelp } from "./components/ShortcutsHelp";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { TooltipProvider } from "./components/ui/tooltip";
import { useSidebarState } from "./hooks/useSidebarState";
import { useViewedState } from "./hooks/useViewedState";
import { useFileOrder } from "./hooks/useFileOrder";
import { useKeyboard } from "./hooks/useKeyboard";
import { useDiffPrefs } from "./hooks/useDiffPrefs";
import { useFileTreeMode } from "./hooks/useFileTreeMode";
import { useActionError } from "./hooks/useActionError";
import { DiffOptionsMenu } from "./components/DiffOptionsMenu";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
  type PanelImperativeHandle,
} from "./components/ui/resizable";
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
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [pendingComment, setPendingComment] = useState<{
    path: string;
    startLine: number;
    endLine: number;
    startSide: string;
    endSide: string;
  } | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const { actionError, setActionError, wrapAction } = useActionError();
  const { isViewed, toggleViewed, viewedCount } = useViewedState(
    prKey,
    currentFiles,
    setActionError
  );
  const { diffStyle, wordWrap, toggleDiffStyle, toggleWordWrap } = useDiffPrefs();
  const { treeMode, toggleTreeMode } = useFileTreeMode();
  const fileRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const leftPanelRef = useRef<PanelImperativeHandle | null>(null);
  const rightPanelRef = useRef<PanelImperativeHandle | null>(null);

  useEffect(() => {
    const panel = leftPanelRef.current;
    if (!panel) return;
    if (leftOpen && panel.isCollapsed()) panel.expand();
    else if (!leftOpen && !panel.isCollapsed()) panel.collapse();
  }, [leftOpen]);

  useEffect(() => {
    const panel = rightPanelRef.current;
    if (!panel) return;
    if (rightOpen && panel.isCollapsed()) panel.expand();
    else if (!rightOpen && !panel.isCollapsed()) panel.collapse();
  }, [rightOpen]);

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
    (params: {
      path: string;
      startLine: number;
      endLine: number;
      startSide: "LEFT" | "RIGHT";
      endSide: "LEFT" | "RIGHT";
    }) => {
      setPendingComment(params);
    },
    []
  );

  const handleSubmitInlineComment = useCallback(
    async (params: {
      body: string;
      path: string;
      line: number;
      side: string;
      startLine?: number;
      startSide?: string;
    }) => {
      const comment = await wrapAction(
        () => api.postInlineComment(params),
        "Failed to post comment"
      );
      if (comment) {
        addComment(comment);
        setPendingComment(null);
      }
    },
    [addComment, wrapAction]
  );

  const handleReplyToComment = useCallback(
    async (commentId: number, body: string) => {
      const comment = await wrapAction(
        () => api.replyToComment(commentId, body),
        "Failed to post reply"
      );
      if (comment) addComment(comment);
    },
    [addComment, wrapAction]
  );

  const handlePostComment = useCallback(
    async (body: string) => {
      const comment = await wrapAction(
        () => api.postComment(body),
        "Failed to post comment"
      );
      if (comment) addComment(comment);
    },
    [addComment, wrapAction]
  );

  const handleSubmitReview = useCallback(
    async (
      event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
      body?: string
    ) => {
      await wrapAction(
        () => api.submitReview(event, body),
        "Failed to submit review"
      );
    },
    [wrapAction]
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
        id: "toggle-tree-mode",
        label: `Switch to ${treeMode === "flat" ? "tree" : "flat"} file view`,
        action: toggleTreeMode,
      },
      {
        id: "toggle-diff-style",
        label: "Toggle split/unified diff",
        action: toggleDiffStyle,
      },
      {
        id: "toggle-wrap",
        label: `${wordWrap ? "Disable" : "Enable"} word wrap`,
        shortcut: "w",
        action: toggleWordWrap,
      },
      {
        id: "shortcuts",
        label: "Show keyboard shortcuts",
        shortcut: "?",
        action: () => setHelpOpen(true),
      },
    ],
    [toggleLeft, toggleRight, toggleMode, mode, toggleDiffStyle, wordWrap, toggleWordWrap, treeMode, toggleTreeMode]
  );

  useKeyboard({
    nextFile: () => navigateFile(1),
    prevFile: () => navigateFile(-1),
    markReviewed: () => {
      if (currentFile) toggleViewed(currentFile);
    },
    toggleLeftSidebar: toggleLeft,
    toggleRightSidebar: toggleRight,
    openCommandPalette: () => setCommandPaletteOpen(true),
    submitReview: () => {},
    showHelp: () => setHelpOpen(true),
    toggleDiffStyle,
    toggleWordWrap,
  });

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorScreen message={error ?? "Failed to load PR"} />;

  return (
    <TooltipProvider delayDuration={200}>
    <div className="h-screen flex flex-col zen-noise">
      <ProgressBar
        reviewedCount={viewedCount}
        totalFiles={orderedFiles.length}
      />

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup orientation="horizontal" className="h-full">
          <ResizablePanel
            panelRef={leftPanelRef}
            defaultSize="240px"
            minSize="220px"
            maxSize="500px"
            collapsible
            collapsedSize={0}
            className="bg-zen-surface border-r border-zen-border"
            onResize={(size, _id, prev) => {
              const wasCollapsed = (prev?.inPixels ?? size.inPixels) === 0;
              const nowCollapsed = size.inPixels === 0;
              if (wasCollapsed !== nowCollapsed) {
                if (nowCollapsed && leftOpen) toggleLeft();
                if (!nowCollapsed && !leftOpen) toggleLeft();
              }
            }}
          >
            <div className="h-full overflow-hidden">
              <FileTree
                files={orderedFiles}
                currentFile={currentFile}
                isReviewed={isViewed}
                onToggleReviewed={toggleViewed}
                onFileClick={handleFileClick}
                mode={mode}
                onToggleMode={toggleMode}
                treeMode={treeMode}
                onToggleTreeMode={toggleTreeMode}
              />
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel minSize="400px">
            <div className="h-full flex flex-col">
              <div className="flex items-center gap-3 px-4 py-2 bg-zen-surface/80 backdrop-blur-sm border-b border-zen-border">
                {activeCommit && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setActiveCommit(null)}>
                      <ArrowLeft className="w-3 h-3" />
                      Back to full diff
                    </Button>
                    <Badge variant="accent">
                      {activeCommit.slice(0, 7)}
                    </Badge>
                    <span className="text-2xs text-zen-muted">
                      Showing {orderedFiles.length} file{orderedFiles.length === 1 ? "" : "s"} from this commit
                    </span>
                  </>
                )}
                <div className="ml-auto">
                  <DiffOptionsMenu
                    diffStyle={diffStyle}
                    wordWrap={wordWrap}
                    onToggleDiffStyle={toggleDiffStyle}
                    onToggleWordWrap={toggleWordWrap}
                  />
                </div>
              </div>
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
                    diffStyle={diffStyle}
                    wordWrap={wordWrap}
                    isViewed={isViewed}
                    onToggleViewed={toggleViewed}
                  />
                </Suspense>
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel
            panelRef={rightPanelRef}
            defaultSize="320px"
            minSize="280px"
            maxSize="600px"
            collapsible
            collapsedSize={0}
            className="bg-zen-surface border-l border-zen-border"
            onResize={(size, _id, prev) => {
              const wasCollapsed = (prev?.inPixels ?? size.inPixels) === 0;
              const nowCollapsed = size.inPixels === 0;
              if (wasCollapsed !== nowCollapsed) {
                if (nowCollapsed && rightOpen) toggleRight();
                if (!nowCollapsed && !rightOpen) toggleRight();
              }
            }}
          >
            <div className="h-full overflow-hidden">
              <ContextPanel
                pr={data.pr}
                comments={data.comments}
                commits={data.commits}
                activeCommit={activeCommit}
                onSelectCommit={setActiveCommit}
                onPostComment={handlePostComment}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
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
    </TooltipProvider>
  );
}

export function App() {
  return (
    <PRProvider>
      <AppContent />
    </PRProvider>
  );
}
