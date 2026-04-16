import { useState } from "react";
import { cn } from "../lib/utils";

interface ProgressBarProps {
  reviewedCount: number;
  totalFiles: number;
}

export function ProgressBar({ reviewedCount, totalFiles }: ProgressBarProps) {
  const [hovering, setHovering] = useState(false);
  const pct = totalFiles > 0 ? (reviewedCount / totalFiles) * 100 : 0;
  const isComplete = reviewedCount === totalFiles && totalFiles > 0;

  return (
    <div
      className="relative group"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="h-[3px] w-full bg-zen-border/50 relative overflow-hidden cursor-pointer">
        <div
          className={cn(
            "h-full transition-all duration-500 ease-out relative",
            isComplete ? "bg-zen-add-text" : "bg-zen-accent"
          )}
          style={{ width: `${pct}%` }}
        >
          {!isComplete && pct > 0 && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer bg-[length:200%_100%]" />
          )}
        </div>
      </div>

      {hovering && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 animate-fade-in z-50">
          <div className="px-3 py-1.5 bg-zen-elevated border border-zen-border rounded-lg shadow-overlay text-xs font-mono text-zen-text whitespace-nowrap flex items-center gap-2">
            <span className={cn(
              "inline-block w-1.5 h-1.5 rounded-full",
              isComplete ? "bg-zen-add-text" : "bg-zen-accent animate-pulse-subtle"
            )} />
            <span className="text-zen-text-secondary">
              {reviewedCount}<span className="text-zen-muted">/{totalFiles}</span>
            </span>
            <span className="text-zen-muted">|</span>
            <span className={isComplete ? "text-zen-add-text" : "text-zen-accent"}>
              {Math.round(pct)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
