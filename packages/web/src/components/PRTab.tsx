import { ArrowLeft } from "lucide-react";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";
import type { PRMetadata } from "../lib/api";
import { Markdown } from "./Markdown";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitBranch, GitMerge, GitPullRequest } from "lucide-react";
import { cn } from "@/lib/utils";

interface PRTabProps {
  pr: PRMetadata;
}

const stateVariant: Record<string, "success" | "destructive" | "purple"> = {
  open: "success",
  closed: "destructive",
  merged: "purple",
};

export function PRTab({ pr }: PRTabProps) {
  return (
    <div className="p-4 space-y-4 animate-fade-in">
      {/* Title & meta */}
      <div>
        <h2 className="text-[15px] font-semibold text-zen-text leading-snug tracking-tight">
          {pr.title}
        </h2>
        <div className="flex items-center gap-2 mt-2.5">
          <Badge variant={stateVariant[pr.state] ?? "default"}>
            {pr.state}
          </Badge>
          <span className="flex items-center gap-1.5">
            <img
              src={pr.author.avatarUrl}
              alt=""
              className="w-4 h-4 rounded-full ring-1 ring-zen-border"
            />
            <span className="text-xs text-zen-text-secondary font-medium">
              {pr.author.login}
            </span>
          </span>
        </div>
      </div>

      {/* Branches */}
      <div className="flex items-center gap-2 text-xs font-mono">
        <span className="px-2 py-0.5 bg-zen-elevated rounded text-zen-text-secondary truncate max-w-[120px]">
          {pr.branch.base}
        </span>
        <ArrowLeft className="w-3 h-3 text-zen-muted shrink-0" />
        <span className="px-2 py-0.5 bg-zen-accent-dim rounded text-zen-accent truncate max-w-[120px]">
          {pr.branch.head}
        </span>
      </div>

      {/* Labels */}
      {pr.labels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {pr.labels.map((label) => (
            <Badge key={label} variant="default">{label}</Badge>
          ))}
        </div>
      )}

      {/* Description */}
      {pr.body && (
        <div className="pt-3 border-t border-zen-border">
          <div className="zen-prose whitespace-pre-wrap break-words">
            {pr.body}
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
