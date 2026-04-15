import type { PRCommit } from "../lib/api";

interface CommitsTabProps {
  commits: PRCommit[];
  activeCommit: string | null;
  onSelectCommit: (sha: string | null) => void;
}

export function CommitsTab({
  commits,
  activeCommit,
  onSelectCommit,
}: CommitsTabProps) {
  return (
    <div className="p-3 space-y-1">
      {activeCommit && (
        <button
          onClick={() => onSelectCommit(null)}
          className="w-full text-left text-xs text-zen-accent hover:text-zen-accent/80 mb-2 transition-colors"
        >
          &larr; All changes
        </button>
      )}
      {commits.map((commit) => {
        const shortSha = commit.sha.slice(0, 7);
        const firstLine = commit.message.split("\n")[0];
        const isActive = commit.sha === activeCommit;

        return (
          <button
            key={commit.sha}
            onClick={() => onSelectCommit(commit.sha)}
            className={`w-full text-left p-2 rounded-md transition-colors ${
              isActive
                ? "bg-zen-accent/10 text-zen-text"
                : "hover:bg-zen-surface text-zen-muted hover:text-zen-text"
            }`}
          >
            <div className="flex items-center gap-2">
              <code className="text-xs text-zen-accent shrink-0">
                {shortSha}
              </code>
              <span className="text-xs truncate">{firstLine}</span>
            </div>
            <div className="text-xs text-zen-muted/60 mt-0.5 pl-16">
              {commit.author.login}
            </div>
          </button>
        );
      })}
    </div>
  );
}
