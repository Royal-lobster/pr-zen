import { cn } from "../lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface ProgressBarProps {
  reviewedCount: number;
  totalFiles: number;
}

export function ProgressBar({ reviewedCount, totalFiles }: ProgressBarProps) {
  const pct = totalFiles > 0 ? (reviewedCount / totalFiles) * 100 : 0;
  const isComplete = reviewedCount === totalFiles && totalFiles > 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
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
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="px-3 py-1.5 bg-zen-elevated border border-zen-border rounded-lg shadow-overlay font-mono text-zen-text flex items-center gap-2"
        >
          <span
            className={cn(
              "inline-block w-1.5 h-1.5 rounded-full",
              isComplete
                ? "bg-zen-add-text"
                : "bg-zen-accent animate-pulse-subtle"
            )}
          />
          <span className="text-zen-text-secondary">
            {reviewedCount}
            <span className="text-zen-muted">/{totalFiles}</span>
          </span>
          <span className="text-zen-muted">|</span>
          <span className={isComplete ? "text-zen-add-text" : "text-zen-accent"}>
            {Math.round(pct)}%
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
