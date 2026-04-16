import { useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { PRTab } from "./PRTab";
import { ChatTab } from "./ChatTab";
import { CommitsTab } from "./CommitsTab";
import { cn } from "../lib/utils";
import type { PRComment, PRCommit, PRMetadata } from "../lib/api";

interface ContextPanelProps {
  pr: PRMetadata;
  comments: PRComment[];
  commits: PRCommit[];
  activeCommit: string | null;
  onSelectCommit: (sha: string | null) => void;
  onPostComment: (body: string) => Promise<void>;
}

export function ContextPanel({
  pr,
  comments,
  commits,
  activeCommit,
  onSelectCommit,
  onPostComment,
}: ContextPanelProps) {
  const chatCount = useMemo(
    () => comments.filter((c) => c.type === "pr").length,
    [comments]
  );

  return (
    <Tabs defaultValue="pr" className="h-full flex flex-col">
      <TabsList>
        <TabsTrigger value="pr">PR</TabsTrigger>
        <TabsTrigger value="chat">
          <span className="flex items-center gap-1.5">
            Chat
            {chatCount > 0 && (
              <span className={cn(
                "text-2xs font-mono tabular-nums px-1 rounded-full",
                "bg-zen-accent/15 text-zen-accent"
              )}>
                {chatCount}
              </span>
            )}
          </span>
        </TabsTrigger>
        <TabsTrigger value="commits">
          <span className="flex items-center gap-1.5">
            Commits
            <span className={cn(
              "text-2xs font-mono tabular-nums px-1 rounded-full",
              "bg-zen-elevated text-zen-muted"
            )}>
              {commits.length}
            </span>
          </span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pr">
        <PRTab pr={pr} />
      </TabsContent>
      <TabsContent value="chat" className="h-0 flex-1">
        <ChatTab comments={comments} onPostComment={onPostComment} />
      </TabsContent>
      <TabsContent value="commits">
        <CommitsTab
          commits={commits}
          activeCommit={activeCommit}
          onSelectCommit={onSelectCommit}
        />
      </TabsContent>
    </Tabs>
  );
}
