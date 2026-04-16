import { ArrowLeft, GitCommit } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import type { PRCommit } from "../lib/api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitCommit } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className="p-3 space-y-1 animate-fade-in">
      {activeCommit && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSelectCommit(null)}
          className="w-full justify-start mb-2"
        >
          <ArrowLeft className="w-3 h-3" />
          All changes
        </Button>
      )}
      {commits.map((commit) => {
        const shortSha = commit.sha.slice(0, 7);
        const firstLine = commit.message.split("\n")[0];
        const isActive = commit.sha === activeCommit;

        return (
          <button
            key={commit.sha}
            onClick={() => onSelectCommit(commit.sha)}
            className={cn(
              "w-full text-left p-2.5 rounded-lg transition-all duration-100 group",
              isActive
                ? "bg-zen-accent-dim text-zen-text"
                : "hover:bg-zen-elevated text-zen-text-secondary hover:text-zen-text"
            )}
          >
            <div className="flex items-start gap-2.5">
              <GitCommit className={cn(
                "w-3.5 h-3.5 shrink-0 mt-0.5",
                isActive ? "text-zen-accent" : "text-zen-muted"
              )} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className={cn(
                    "text-2xs font-mono shrink-0",
                    isActive ? "text-zen-accent" : "text-zen-accent/70"
                  )}>
                    {shortSha}
                  </code>
                  <span className="text-xs truncate">{firstLine}</span>
                </div>
                <div className="text-2xs text-zen-muted mt-0.5">
                  {commit.author.login}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
