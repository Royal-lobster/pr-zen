import { useState } from "react";

interface ProgressBarProps {
  reviewedCount: number;
  totalFiles: number;
}

export function ProgressBar({ reviewedCount, totalFiles }: ProgressBarProps) {
  const [hovering, setHovering] = useState(false);
  const pct = totalFiles > 0 ? (reviewedCount / totalFiles) * 100 : 0;

  return (
    <div
      className="h-1 w-full bg-zen-surface relative cursor-pointer"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div
        className="h-full bg-zen-accent transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
      {hovering && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 bg-zen-surface border border-zen-border rounded text-xs text-zen-text whitespace-nowrap z-50">
          {reviewedCount}/{totalFiles} files &mdash; {Math.round(pct)}%
        </div>
      )}
    </div>
  );
}
