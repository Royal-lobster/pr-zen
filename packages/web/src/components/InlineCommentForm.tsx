import { useState, useRef, useEffect, type FormEvent } from "react";

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
      className="border border-zen-border rounded-md bg-zen-bg my-1 mx-2 p-3"
    >
      <div className="text-xs text-zen-muted mb-2">
        {path}:{line}
      </div>
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a comment..."
        rows={3}
        className="w-full bg-zen-surface border border-zen-border rounded px-3 py-2 text-xs text-zen-text placeholder:text-zen-muted/50 resize-none focus:outline-none focus:border-zen-accent"
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
        <button
          type="button"
          onClick={onCancel}
          className="px-2 py-1 text-xs text-zen-muted hover:text-zen-text transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!body.trim() || submitting}
          className="px-3 py-1 text-xs bg-zen-accent text-white rounded disabled:opacity-40"
        >
          {submitting ? "Posting..." : "Comment"}
        </button>
      </div>
    </form>
  );
}
