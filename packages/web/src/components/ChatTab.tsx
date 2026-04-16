import { useState, useRef, useEffect, useMemo, type FormEvent } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Kbd } from "./ui/kbd";
import { cn } from "../lib/utils";
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
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

export function ChatTab({ comments, onPostComment }: ChatTabProps) {
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const prComments = useMemo(() => comments.filter((c) => c.type === "pr"), [comments]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [prComments.length]);

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
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {prComments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-10 h-10 rounded-full bg-zen-elevated flex items-center justify-center mb-3">
              <MessageCircle className="w-5 h-5 text-zen-muted" />
            </div>
            <p className="text-xs text-zen-muted">No comments yet</p>
          </div>
        )}
        {prComments.map((comment) => (
          <div key={comment.id} className="group animate-fade-in">
            <div className="flex items-start gap-2.5">
              <img
                src={comment.author.avatarUrl}
                alt=""
                className="w-6 h-6 rounded-full ring-1 ring-zen-border shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-zen-text">
                    {comment.author.login}
                  </span>
                  <span className="text-2xs text-zen-muted font-mono tabular-nums">
                    {formatTime(comment.createdAt)}
                  </span>
                </div>
                <div className="mt-1 zen-prose text-[13px] whitespace-pre-wrap break-words">
                  {comment.body}
                </div>
              </div>
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
          className={cn(
            "w-full bg-zen-bg border border-zen-border rounded-lg px-3 py-2",
            "text-[13px] font-mono text-zen-text placeholder:text-zen-muted/40",
            "resize-none focus:outline-none focus:border-zen-accent/50",
            "focus:ring-1 focus:ring-zen-accent/20 transition-all duration-150"
          )}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.metaKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-2xs text-zen-muted flex items-center gap-0.5">
            <Kbd>{"\u2318"}</Kbd><Kbd>{"\u21B5"}</Kbd> to send
          </span>
          <Button disabled={!body.trim() || posting}>
            {posting ? "Posting..." : "Comment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
