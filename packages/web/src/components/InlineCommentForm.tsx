import { useState, useRef, useEffect, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InlineCommentFormProps {
  path: string;
  line: number;
  side: string;
  onSubmit: (params: {
    body: string;
    path: string;
    line: number;
    side: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export function InlineCommentForm({
  path,
  line,
  side,
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
      await onSubmit({ body: body.trim(), path, line, side });
      onCancel();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "border border-border rounded-md bg-card my-1 mx-2 p-3"
      )}
    >
      <div className="text-xs text-muted-foreground mb-2">
        {path}:{line}
      </div>
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a comment..."
        rows={3}
        className={cn(
          "w-full bg-card border border-border rounded px-3 py-2 text-xs",
          "text-foreground placeholder:text-muted-foreground/50",
          "resize-none focus:outline-none focus:border-primary"
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
      <div className="flex justify-end gap-2 mt-2">
        <Button
          type="button"
          onClick={onCancel}
          variant="ghost"
          size="sm"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!body.trim() || submitting}
          size="sm"
          variant="default"
        >
          {submitting ? "Posting..." : "Comment"}
        </Button>
      </div>
    </form>
  );
}
