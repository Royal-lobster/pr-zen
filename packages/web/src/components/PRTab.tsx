import type { PRMetadata } from "../lib/api";
import { Markdown } from "./Markdown";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitBranch, GitMerge, GitPullRequest } from "lucide-react";
import { cn } from "@/lib/utils";

interface PRTabProps {
  pr: PRMetadata;
}

function stateVariant(state: PRMetadata["state"]) {
  if (state === "open") return "success" as const;
  if (state === "merged") return "default" as const;
  return "destructive" as const;
}

function StateIcon({ state }: { state: PRMetadata["state"] }) {
  const cls = "h-3 w-3";
  if (state === "merged") return <GitMerge className={cls} />;
  if (state === "closed") return <GitPullRequest className={cls} />;
  return <GitPullRequest className={cls} />;
}

export function PRTab({ pr }: PRTabProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Title + number */}
        <div>
          <h2 className="text-base font-semibold text-foreground leading-tight">
            {pr.title}{" "}
            <span className="text-muted-foreground font-normal">
              #{pr.number}
            </span>
          </h2>

          {/* State badge + author */}
          <div className="flex items-center gap-2 mt-2">
            <Badge
              variant={stateVariant(pr.state)}
              className={cn(
                "gap-1",
                pr.state === "merged" && "bg-purple-500/20 text-purple-400 border-transparent"
              )}
            >
              <StateIcon state={pr.state} />
              {pr.state}
            </Badge>
            <div className="flex items-center gap-1.5">
              <img
                src={pr.author.avatarUrl}
                alt={pr.author.login}
                className="w-4 h-4 rounded-full"
              />
              <span className="text-xs text-muted-foreground">
                {pr.author.login}
              </span>
            </div>
          </div>
        </div>

        {/* Branch info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <GitBranch className="h-3 w-3 shrink-0" />
          <span className="font-mono">{pr.branch.head}</span>
          <span className="text-muted-foreground/50">&rarr;</span>
          <span className="font-mono">{pr.branch.base}</span>
        </div>

        {/* Labels */}
        {pr.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {pr.labels.map((label) => (
              <Badge key={label} variant="secondary" className="text-xs">
                {label}
              </Badge>
            ))}
          </div>
        )}

        {/* Description as Markdown */}
        {pr.body && (
          <div className="pt-2 border-t border-border">
            <Markdown content={pr.body} />
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
