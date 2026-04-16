import { useState } from "react";
import { Button } from "./ui/button";
import { cn, formatRelativeTime } from "../lib/utils";
import type { PRComment } from "../lib/api";

interface CommentThreadProps {
  comments: PRComment[];
  onReply: (commentId: number, body: string) => Promise<void>;
}

export function CommentThread({ comments, onReply }: CommentThreadProps) {
  const [replyBody, setReplyBody] = useState("");
  const [replying, setReplying] = useState(false);
  const rootComment = comments[0];

  async function handleReply() {
    if (!replyBody.trim() || replying) return;
    setReplying(true);
    try {
      await onReply(rootComment.id, replyBody.trim());
      setReplyBody("");
    } finally {
      setReplying(false);
    }
  }

  return (
    <div className="border border-zen-border rounded-lg bg-zen-bg my-1.5 mx-2 overflow-hidden shadow-card animate-fade-in">
      {comments.map((c, i) => (
        <div
          key={c.id}
          className={cn(
            "px-3 py-2.5",
            i < comments.length - 1 && "border-b border-zen-border-subtle"
          )}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <img
              src={c.author.avatarUrl}
              className="w-4 h-4 rounded-full ring-1 ring-zen-border"
              alt=""
            />
            <span className="text-xs font-semibold text-zen-text">
              {c.author.login}
            </span>
            <span className="text-2xs text-zen-muted font-mono tabular-nums">
              {formatRelativeTime(c.createdAt)}
            </span>
          </div>
          <div className="zen-prose text-xs whitespace-pre-wrap pl-6">
            {c.body}
          </div>
        </div>
      ))}
      <div className="px-3 py-2 flex gap-2 bg-zen-surface/50">
        <input
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          placeholder="Reply..."
          className={cn(
            "flex-1 bg-zen-bg border border-zen-border rounded-lg px-2.5 py-1.5",
            "text-xs font-mono text-zen-text placeholder:text-zen-muted/40",
            "focus:outline-none focus:border-zen-accent/50 focus:ring-1 focus:ring-zen-accent/20",
            "transition-all duration-150"
          )}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleReply();
            }
          }}
        />
        <Button
          size="sm"
          onClick={handleReply}
          disabled={!replyBody.trim() || replying}
        >
          Reply
        </Button>
      </div>
    </div>
  );
}
