import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Kbd } from "./ui/kbd";
import { cn } from "../lib/utils";

interface BottomBarProps {
  onSubmitReview: (
    event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
    body?: string
  ) => Promise<void>;
}

type ReviewAction = "APPROVE" | "REQUEST_CHANGES" | "COMMENT";

const actionConfig: Record<ReviewAction, { label: string; icon: string }> = {
  APPROVE: { label: "Approve", icon: "\u2713" },
  REQUEST_CHANGES: { label: "Request Changes", icon: "\u2717" },
  COMMENT: { label: "Comment", icon: "\u2709" },
};

export function BottomBar({ onSubmitReview }: BottomBarProps) {
  const [action, setAction] = useState<ReviewAction>("APPROVE");
  const [submitting, setSubmitting] = useState(false);

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
    <div className="flex items-center justify-between px-4 py-2 border-t border-zen-border bg-zen-surface/80 backdrop-blur-sm">
      {/* Left: keyboard hints */}
      <div className="flex items-center gap-3 text-zen-muted">
        <span className="flex items-center gap-1.5 text-2xs">
          <Kbd>j</Kbd><Kbd>k</Kbd>
          <span>navigate</span>
        </span>
        <span className="flex items-center gap-1.5 text-2xs">
          <Kbd>x</Kbd>
          <span>review</span>
        </span>
        <span className="flex items-center gap-1.5 text-2xs">
          <Kbd>{"\u2318"}K</Kbd>
          <span>palette</span>
        </span>
      </div>

      {/* Right: review actions */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-zen-bg rounded-lg border border-zen-border overflow-hidden">
          {(Object.entries(actionConfig) as [ReviewAction, typeof actionConfig[ReviewAction]][]).map(
            ([value, config]) => (
              <button
                key={value}
                onClick={() => setAction(value)}
                className={cn(
                  "px-2.5 py-1.5 text-2xs font-medium transition-all duration-100",
                  action === value
                    ? "bg-zen-elevated text-zen-text"
                    : "text-zen-muted hover:text-zen-text-secondary"
                )}
              >
                {config.label}
              </button>
            )
          )}
        </div>
        <Button onClick={handleSubmit} disabled={submitting} className="font-mono">
          {submitting ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              Submitting
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span>{actionConfig[action].icon}</span>
              Submit
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
