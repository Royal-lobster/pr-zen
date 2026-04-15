import { useState, type FormEvent } from "react";
import type { PRComment } from "../lib/api";

interface ChatTabProps {
  comments: PRComment[];
  onPostComment: (body: string) => Promise<void>;
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

export function ChatTab({ comments, onPostComment }: ChatTabProps) {
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  const prComments = comments.filter((c) => c.type === "pr");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() || posting) return;
    setPosting(true);
    try {
      await onPostComment(body.trim());
      setBody("");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {prComments.length === 0 && (
          <p className="text-sm text-zen-muted text-center py-4">
            No comments yet.
          </p>
        )}
        {prComments.map((comment) => (
          <div key={comment.id} className="space-y-1">
            <div className="flex items-center gap-2">
              <img
                src={comment.author.avatarUrl}
                alt={comment.author.login}
                className="w-5 h-5 rounded-full"
              />
              <span className="text-xs font-medium text-zen-text">
                {comment.author.login}
              </span>
              <span className="text-xs text-zen-muted">
                {formatTime(comment.createdAt)}
              </span>
            </div>
            <div className="text-sm text-zen-text/80 whitespace-pre-wrap break-words pl-7">
              {comment.body}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="p-3 border-t border-zen-border">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Leave a comment..."
          rows={3}
          className="w-full bg-zen-bg border border-zen-border rounded-md px-3 py-2 text-sm text-zen-text placeholder:text-zen-muted/50 resize-none focus:outline-none focus:border-zen-accent"
        />
        <div className="flex justify-end mt-2">
          <button
            type="submit"
            disabled={!body.trim() || posting}
            className="px-3 py-1.5 text-xs font-medium bg-zen-accent text-white rounded-md disabled:opacity-40 hover:bg-zen-accent/80 transition-colors"
          >
            {posting ? "Posting..." : "Comment"}
          </button>
        </div>
      </form>
    </div>
  );
}
