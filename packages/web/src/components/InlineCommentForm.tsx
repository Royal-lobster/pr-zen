import { useState, useRef, useEffect, type FormEvent } from "react";
import { Button } from "./ui/button";
import { Kbd } from "./ui/kbd";
import { cn } from "../lib/utils";

interface InlineCommentFormProps {
  path: string;
  startLine: number;
  endLine: number;
  startSide: string;
  endSide: string;
  onSubmit: (params: {
    body: string;
    path: string;
    line: number;
    side: string;
    startLine?: number;
    startSide?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export function InlineCommentForm({
  path,
  startLine,
  endLine,
  startSide,
  endSide,
  onSubmit,
  onCancel,
}: InlineCommentFormProps) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    try {
      const payload =
        startLine !== endLine
          ? {
              body: body.trim(),
              path,
              line: endLine,
              side: endSide,
              startLine,
              startSide,
            }
          : {
              body: body.trim(),
              path,
              line: endLine,
              side: endSide,
            };
      await onSubmit(payload);
      onCancel();
    } finally {
      setSubmitting(false);
    }
  }

  const locationLabel =
    startLine === endLine ? `${path}:${endLine}` : `${path}:${startLine}-${endLine}`;

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-zen-accent/20 rounded-lg bg-zen-bg my-1.5 mx-2 p-3 shadow-card animate-fade-in-up"
    >
      <div className="text-2xs text-zen-muted font-mono mb-2">
        {locationLabel}
      </div>
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a comment..."
        rows={3}
        className={cn(
          "w-full bg-zen-surface border border-zen-border rounded-lg px-3 py-2",
          "text-xs font-mono text-zen-text placeholder:text-zen-muted/40",
          "resize-none focus:outline-none focus:border-zen-accent/50",
          "focus:ring-1 focus:ring-zen-accent/20 transition-all duration-150"
        )}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.metaKey) {
            e.preventDefault();
            handleSubmit(e);
          }
          if (e.key === "Escape") {
            onCancel();
          }
        }}
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-2xs text-zen-muted flex items-center gap-0.5">
          <Kbd>{"\u2318"}</Kbd><Kbd>{"\u21B5"}</Kbd> submit
          <span className="mx-1 text-zen-border">|</span>
          <Kbd>esc</Kbd> cancel
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" type="submit" disabled={!body.trim() || submitting}>
            {submitting ? "Posting..." : "Comment"}
          </Button>
        </div>
      </div>
    </form>
  );
}
