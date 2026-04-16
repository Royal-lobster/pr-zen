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
    <ScrollArea className="h-full">
      <div className="p-3 space-y-1">
        {activeCommit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectCommit(null)}
            className="w-full justify-start text-xs text-primary hover:text-primary/80 mb-2"
          >
            &larr; All changes
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
                "w-full text-left p-2 rounded-md transition-colors",
                isActive
                  ? "bg-primary/10 text-foreground"
                  : "hover:bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2">
                <GitCommit className="h-3 w-3 shrink-0 text-primary" />
                <code className="text-xs text-primary shrink-0">
                  {shortSha}
                </code>
                <span className="text-xs truncate">{firstLine}</span>
              </div>
              <div className="text-xs text-muted-foreground/60 mt-0.5 pl-[4.5rem]">
                {commit.author.login}
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
