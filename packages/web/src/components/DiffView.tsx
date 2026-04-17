import { useMemo } from "react";
import {
  PatchDiff,
  Virtualizer,
  WorkerPoolContextProvider,
  type DiffLineAnnotation,
} from "@pierre/diffs/react";
import { FileCode, ArrowLeft } from "lucide-react";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import type { PRFile, PRComment } from "../lib/api";
import { CommentThread } from "./CommentThread";
import { InlineCommentForm } from "./InlineCommentForm";
import DiffWorker from "@pierre/diffs/worker/worker-portable.js?worker";

const workerFactory = () => new DiffWorker();

interface PendingComment {
  path: string;
  startLine: number;
  endLine: number;
  startSide: string;
  endSide: string;
}

interface DiffViewProps {
  files: PRFile[];
  comments: PRComment[];
  pendingComment: PendingComment | null;
  onGutterClick: (params: {
    path: string;
    startLine: number;
    endLine: number;
    startSide: "LEFT" | "RIGHT";
    endSide: "LEFT" | "RIGHT";
  }) => void;
  onSubmitInlineComment: (params: {
    body: string;
    path: string;
    line: number;
    side: string;
    startLine?: number;
    startSide?: string;
  }) => Promise<void>;
  onCancelComment: () => void;
  onReplyToComment: (commentId: number, body: string) => Promise<void>;
  fileRef?: (path: string, el: HTMLDivElement | null) => void;
  diffStyle: "unified" | "split";
  wordWrap: boolean;
  isViewed: (path: string) => boolean;
  onToggleViewed: (path: string) => void;
}

const statusBadgeVariant: Record<string, "success" | "accent" | "destructive" | "warn"> = {
  added: "success",
  modified: "accent",
  removed: "destructive",
  renamed: "warn",
};

export function DiffView({
  files,
  comments,
  pendingComment,
  onGutterClick,
  onSubmitInlineComment,
  onCancelComment,
  onReplyToComment,
  fileRef,
  diffStyle,
  wordWrap,
  isViewed,
  onToggleViewed,
}: DiffViewProps) {
  const commentsByFile = useMemo(() => {
    const map = new Map<string, PRComment[]>();
    for (const c of comments) {
      if (c.type !== "inline" || !c.path) continue;
      const existing = map.get(c.path) ?? [];
      existing.push(c);
      map.set(c.path, existing);
    }
    return map;
  }, [comments]);

  return (
    <WorkerPoolContextProvider
      poolOptions={{ workerFactory }}
      highlighterOptions={{
        theme: { dark: "pierre-dark", light: "pierre-light" },
        langs: [
          "typescript",
          "tsx",
          "javascript",
          "jsx",
          "json",
          "css",
          "html",
          "markdown",
          "yaml",
          "bash",
          "python",
          "go",
          "rust",
        ],
      }}
    >
    <Virtualizer
      className="h-full overflow-auto"
      contentClassName="space-y-3 p-4"
      config={{
        overscrollSize: 1000,
        intersectionObserverMargin: 2000,
      }}
    >
      {files.map((file) => {
        if (!file.patch) {
          return (
            <div
              key={file.path}
              ref={(el) => fileRef?.(file.path, el)}
              data-file-path={file.path}
              className="border border-zen-border rounded-lg overflow-hidden shadow-card animate-fade-in"
            >
              <div className="flex items-center gap-2 px-4 py-2.5 bg-zen-surface border-b border-zen-border">
                <FileCode className="w-3.5 h-3.5 text-zen-muted" />
                <span className="text-xs font-mono text-zen-text truncate" title={file.path}>
                  {file.path}
                </span>
              </div>
              <div className="p-6 text-xs text-zen-muted text-center">
                Binary file or no changes
              </div>
            </div>
          );
        }

        const fileComments = commentsByFile.get(file.path) ?? [];

        const threadMap = new Map<string, PRComment[]>();
        const idToKey = new Map<number, string>();
        for (const c of fileComments) {
          if (!c.line) continue;
          const key = (c.inReplyToId != null ? idToKey.get(c.inReplyToId) : undefined)
            ?? `${c.line}:${c.side ?? "RIGHT"}`;
          const thread = threadMap.get(key) ?? [];
          thread.push(c);
          threadMap.set(key, thread);
          idToKey.set(c.id, key);
        }

        const annotations: DiffLineAnnotation<{
          thread?: PRComment[];
          isPending?: boolean;
        }>[] = [];
        for (const [key, thread] of threadMap) {
          const [lineStr, side] = key.split(":");
          annotations.push({
            lineNumber: parseInt(lineStr, 10),
            side: side === "LEFT" ? "deletions" : "additions",
            metadata: { thread },
          });
        }

        if (pendingComment && pendingComment.path === file.path) {
          annotations.push({
            lineNumber: pendingComment.endLine,
            side: pendingComment.endSide === "LEFT" ? "deletions" : "additions",
            metadata: { isPending: true },
          });
        }

        const patchWithHeader = [
          `diff --git a/${file.previousPath ?? file.path} b/${file.path}`,
          `--- a/${file.previousPath ?? file.path}`,
          `+++ b/${file.path}`,
          file.patch,
        ].join("\n");

        return (
          <div
            key={file.path}
            ref={(el) => fileRef?.(file.path, el)}
            data-file-path={file.path}
            className="animate-fade-in"
          >
            <PatchDiff
              patch={patchWithHeader}
              options={{
                theme: "pierre-dark",
                diffStyle: diffStyle,
                diffIndicators: "bars",
                hunkSeparators: "line-info-basic",
                expandUnchanged: true,
                lineHoverHighlight: "both",
                enableGutterUtility: true,
                overflow: wordWrap ? "wrap" : "scroll",
                collapsed: isViewed(file.path),
                onGutterUtilityClick: (range: {
                  start: number;
                  end: number;
                  side?: "deletions" | "additions";
                  endSide?: "deletions" | "additions";
                }) => {
                  const startSide =
                    range.side === "deletions" ? "LEFT" : "RIGHT";
                  const endSide =
                    (range.endSide ?? range.side) === "deletions"
                      ? "LEFT"
                      : "RIGHT";
                  onGutterClick({
                    path: file.path,
                    startLine: range.start,
                    endLine: range.end,
                    startSide,
                    endSide,
                  });
                },
              }}
              lineAnnotations={annotations}
              renderAnnotation={(ann) =>
                ann.metadata.isPending && pendingComment ? (
                  <InlineCommentForm
                    path={file.path}
                    startLine={pendingComment.startLine}
                    endLine={pendingComment.endLine}
                    startSide={pendingComment.startSide}
                    endSide={pendingComment.endSide}
                    onSubmit={onSubmitInlineComment}
                    onCancel={onCancelComment}
                  />
                ) : ann.metadata.thread ? (
                  <CommentThread
                    comments={ann.metadata.thread}
                    onReply={onReplyToComment}
                  />
                ) : null
              }
              renderHeaderPrefix={() => {
                const viewed = isViewed(file.path);
                return (
                  <div className="flex items-center gap-2.5 px-3 py-2 w-full">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Checkbox
                          checked={viewed}
                          onCheckedChange={() => onToggleViewed(file.path)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={viewed ? "Mark as unviewed" : "Mark as viewed"}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        {viewed ? "Mark as unviewed" : "Mark as viewed"}
                      </TooltipContent>
                    </Tooltip>
                    <FileCode className="w-3.5 h-3.5 text-zen-muted shrink-0" />
                    <span className="text-xs font-mono text-zen-text truncate" title={file.path}>
                      {file.path}
                    </span>
                    {file.previousPath && (
                      <span className="flex items-center gap-1 text-xs text-zen-muted shrink-0">
                        <ArrowLeft className="w-3 h-3" />
                        <span className="font-mono truncate max-w-[150px]">{file.previousPath}</span>
                      </span>
                    )}
                    <Badge variant={statusBadgeVariant[file.status] ?? "default"} className="ml-auto shrink-0">
                      {file.status}
                    </Badge>
                  </div>
                );
              }}
            />
          </div>
        );
      })}
    </Virtualizer>
    </WorkerPoolContextProvider>
  );
}
