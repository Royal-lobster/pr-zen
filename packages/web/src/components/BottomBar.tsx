import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ChevronUp, Check, MessageSquare, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomBarProps {
  onSubmitReview: (
    event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
    body?: string
  ) => Promise<void>;
}

const actions = [
  { value: "APPROVE" as const, label: "Approve", icon: Check },
  {
    value: "REQUEST_CHANGES" as const,
    label: "Request Changes",
    icon: XCircle,
  },
  { value: "COMMENT" as const, label: "Comment", icon: MessageSquare },
];

export function BottomBar({ onSubmitReview }: BottomBarProps) {
  const [action, setAction] = useState<
    "APPROVE" | "REQUEST_CHANGES" | "COMMENT"
  >("APPROVE");
  const [submitting, setSubmitting] = useState(false);

  const selected = actions.find((a) => a.value === action) ?? actions[0];

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
    <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-card">
      <span className="text-xs text-muted-foreground">
        <kbd className="px-1.5 py-0.5 bg-secondary border border-border rounded text-[10px] text-foreground">
          Cmd+K
        </kbd>{" "}
        Command Palette
      </span>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <selected.icon className="h-3.5 w-3.5" />
              {selected.label}
              <ChevronUp className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top">
            {actions.map((a) => (
              <DropdownMenuItem
                key={a.value}
                onClick={() => setAction(a.value)}
                className={cn(
                  "gap-2",
                  a.value === action && "bg-accent"
                )}
              >
                <a.icon className="h-4 w-4" />
                {a.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Submitting..." : "Submit Review"}
        </Button>
      </div>
    </div>
  );
}
