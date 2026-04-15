import { useState } from "react";
import type { PRComment } from "../lib/api";

interface CommentThreadProps {
  comments: PRComment[];
  onReply: (commentId: number, body: string) => Promise<void>;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
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
    <div className="border border-zen-border rounded-md bg-zen-bg my-1 mx-2 overflow-hidden">
      {comments.map((c) => (
        <div
          key={c.id}
          className="px-3 py-2 border-b border-zen-border last:border-b-0"
        >
          <div className="flex items-center gap-2 mb-1">
            <img
              src={c.author.avatarUrl}
              className="w-4 h-4 rounded-full"
              alt=""
            />
            <span className="text-xs font-medium text-zen-text">
              {c.author.login}
            </span>
            <span className="text-xs text-zen-muted">
              {formatTime(c.createdAt)}
            </span>
          </div>
          <div className="text-xs text-zen-text/80 whitespace-pre-wrap">
            {c.body}
          </div>
        </div>
      ))}
      <div className="px-3 py-2 flex gap-2">
        <input
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          placeholder="Reply..."
          className="flex-1 bg-zen-surface border border-zen-border rounded px-2 py-1 text-xs text-zen-text placeholder:text-zen-muted/50 focus:outline-none focus:border-zen-accent"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleReply();
            }
          }}
        />
        <button
          onClick={handleReply}
          disabled={!replyBody.trim() || replying}
          className="px-2 py-1 text-xs bg-zen-accent text-white rounded disabled:opacity-40"
        >
          Reply
        </button>
      </div>
    </div>
  );
}
