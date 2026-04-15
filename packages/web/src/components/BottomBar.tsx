import { useState } from "react";

interface BottomBarProps {
  onSubmitReview: (
    event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
    body?: string
  ) => Promise<void>;
}

export function BottomBar({ onSubmitReview }: BottomBarProps) {
  const [action, setAction] = useState<
    "APPROVE" | "REQUEST_CHANGES" | "COMMENT"
  >("APPROVE");
  const [submitting, setSubmitting] = useState(false);

  const actions: {
    value: "APPROVE" | "REQUEST_CHANGES" | "COMMENT";
    label: string;
  }[] = [
    { value: "APPROVE", label: "Approve" },
    { value: "REQUEST_CHANGES", label: "Request Changes" },
    { value: "COMMENT", label: "Comment" },
  ];

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmitReview(action);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-zen-border bg-zen-surface">
      <span className="text-xs text-zen-muted">
        <kbd className="px-1.5 py-0.5 bg-zen-bg border border-zen-border rounded text-[10px]">
          Cmd+K
        </kbd>{" "}
        Command Palette
      </span>
      <div className="flex items-center gap-2">
        <select
          value={action}
          onChange={(e) =>
            setAction(
              e.target.value as "APPROVE" | "REQUEST_CHANGES" | "COMMENT"
            )
          }
          className="bg-zen-bg border border-zen-border rounded-md px-2 py-1.5 text-xs text-zen-text focus:outline-none focus:border-zen-accent"
        >
          {actions.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-3 py-1.5 text-xs font-medium bg-zen-accent text-white rounded-md disabled:opacity-40 hover:bg-zen-accent/80 transition-colors"
        >
          {submitting ? "Submitting..." : "Submit Review"}
        </button>
      </div>
    </div>
  );
}
