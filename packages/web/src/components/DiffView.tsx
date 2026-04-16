import { useMemo } from "react";
import {
  PatchDiff,
  Virtualizer,
  type DiffLineAnnotation,
} from "@pierre/diffs/react";
import type { PRFile, PRComment } from "../lib/api";
import { CommentThread } from "./CommentThread";
import { InlineCommentForm } from "./InlineCommentForm";
import { cn } from "@/lib/utils";

interface PendingComment {
  path: string;
  line: number;
  side: string;
}

interface DiffViewProps {
  files: PRFile[];
  comments: PRComment[];
  pendingComment: PendingComment | null;
  onGutterClick: (params: {
    path: string;
    line: number;
    side: "LEFT" | "RIGHT";
  }) => void;
  onSubmitInlineComment: (params: {
    body: string;
    path: string;
    line: number;
    side: string;
  }) => Promise<void>;
  onCancelComment: () => void;
  onReplyToComment: (commentId: number, body: string) => Promise<void>;
  fileRef?: (path: string, el: HTMLDivElement | null) => void;
  diffStyle: "unified" | "split";
}

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
}: DiffViewProps) {
  // Group inline comments by file path
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
    <Virtualizer
      className="h-full overflow-auto"
      contentClassName="space-y-2 p-4"
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
              className="border border-border rounded-lg overflow-hidden"
            >
              <div className="px-4 py-2 bg-card border-b border-border">
                <span className="text-xs font-mono text-foreground">
                  {file.path}
                </span>
              </div>
              <div className="p-4 text-xs text-muted-foreground text-center">
                Binary file or no changes
              </div>
            </div>
          );
        }

        const fileComments = commentsByFile.get(file.path) ?? [];

        // Build annotation threads grouped by line
        const threadMap = new Map<string, PRComment[]>();
        for (const c of fileComments) {
          if (!c.line) continue;
          if (c.inReplyToId) {
            // Find parent thread and add to it
            let added = false;
            for (const [, t] of threadMap) {
              if (t.some((tc) => tc.id === c.inReplyToId)) {
                t.push(c);
                added = true;
                break;
              }
            }
            if (!added) {
              // Orphaned reply -- create standalone thread
              const key = `${c.line}:${c.side ?? "RIGHT"}`;
              const thread = threadMap.get(key) ?? [];
              thread.push(c);
              threadMap.set(key, thread);
            }
          } else {
            const key = `${c.line}:${c.side ?? "RIGHT"}`;
            const thread = threadMap.get(key) ?? [];
            thread.push(c);
            threadMap.set(key, thread);
          }
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

        // Add pending comment annotation
        if (pendingComment && pendingComment.path === file.path) {
          annotations.push({
            lineNumber: pendingComment.line,
            side:
              pendingComment.side === "LEFT" ? "deletions" : "additions",
            metadata: { isPending: true },
          });
        }

        // Build a full unified diff patch string with header
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
                overflow: "scroll",
              }}
              lineAnnotations={annotations}
              renderAnnotation={(ann) =>
                ann.metadata.isPending && pendingComment ? (
                  <InlineCommentForm
                    path={file.path}
                    line={pendingComment.line}
                    side={pendingComment.side}
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
              renderHeaderPrefix={() => (
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5",
                    "bg-card border-b border-border"
                  )}
                >
                  <span className="text-xs font-mono text-foreground">
                    {file.path}
                  </span>
                  {file.previousPath && (
                    <span className="text-xs text-muted-foreground">
                      &larr; {file.previousPath}
                    </span>
                  )}
                </div>
              )}
              renderGutterUtility={(getHoveredLine) => (
                <button
                  className="flex items-center justify-center w-5 h-5 rounded text-primary hover:bg-primary/20 text-xs font-bold"
                  onClick={() => {
                    const hovered = getHoveredLine();
                    if (hovered) {
                      onGutterClick({
                        path: file.path,
                        line: hovered.lineNumber,
                        side: hovered.side === "deletions" ? "LEFT" : "RIGHT",
                      });
                    }
                  }}
                >
                  +
                </button>
              )}
            />
          </div>
        );
      })}
    </Virtualizer>
  );
}
