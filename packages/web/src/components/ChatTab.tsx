import { useState, type FormEvent } from "react";
import type { PRComment } from "../lib/api";
import { Markdown } from "./Markdown";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {prComments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
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
                <span className="text-xs font-medium text-foreground">
                  {comment.author.login}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(comment.createdAt)}
                </span>
              </div>
              <div className="pl-7">
                <Markdown content={comment.body} />
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-3 border-t border-border">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Leave a comment..."
          rows={3}
          className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:border-primary"
        />
        <div className="flex justify-end mt-2">
          <Button
            type="submit"
            size="sm"
            disabled={!body.trim() || posting}
          >
            {posting ? "Posting..." : "Comment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
