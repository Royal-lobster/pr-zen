import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface ProgressBarProps {
  reviewedCount: number;
  totalFiles: number;
}

export function ProgressBar({ reviewedCount, totalFiles }: ProgressBarProps) {
  const pct = totalFiles > 0 ? (reviewedCount / totalFiles) * 100 : 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="h-1 w-full bg-card relative cursor-pointer">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {reviewedCount}/{totalFiles} files &mdash; {Math.round(pct)}%
      </TooltipContent>
    </Tooltip>
  );
}
