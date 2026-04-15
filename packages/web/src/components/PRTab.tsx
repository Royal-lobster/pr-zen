import type { PRMetadata } from "../lib/api";

interface PRTabProps {
  pr: PRMetadata;
}

export function PRTab({ pr }: PRTabProps) {
  const stateBadgeColor =
    pr.state === "merged"
      ? "bg-purple-500/20 text-purple-400"
      : pr.state === "open"
        ? "bg-zen-add-text/20 text-zen-add-text"
        : "bg-zen-del-text/20 text-zen-del-text";

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-zen-text leading-tight">
          {pr.title}
        </h2>
        <div className="flex items-center gap-2 mt-2">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${stateBadgeColor}`}
          >
            {pr.state}
          </span>
          <span className="text-xs text-zen-muted">{pr.author.login}</span>
        </div>
      </div>

      <div className="text-xs text-zen-muted space-y-1">
        <div>
          <span className="text-zen-muted/60">base:</span> {pr.branch.base}
        </div>
        <div>
          <span className="text-zen-muted/60">head:</span> {pr.branch.head}
        </div>
      </div>

      {pr.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {pr.labels.map((label) => (
            <span
              key={label}
              className="text-xs px-2 py-0.5 rounded-full bg-zen-border text-zen-muted"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {pr.body && (
        <div className="pt-2 border-t border-zen-border">
          <div className="text-sm text-zen-text/80 whitespace-pre-wrap break-words">
            {pr.body}
          </div>
        </div>
      )}
    </div>
  );
}
