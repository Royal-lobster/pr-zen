import { PRTab } from "./PRTab";
import { ChatTab } from "./ChatTab";
import { CommitsTab } from "./CommitsTab";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  return (
    <Tabs defaultValue="pr" className="h-full flex flex-col">
      <TabsList className="w-full rounded-none border-b border-border bg-card">
        <TabsTrigger value="pr" className="flex-1 text-xs">
          PR
        </TabsTrigger>
        <TabsTrigger value="chat" className="flex-1 text-xs">
          Chat
        </TabsTrigger>
        <TabsTrigger value="commits" className="flex-1 text-xs">
          Commits
        </TabsTrigger>
      </TabsList>
      <TabsContent value="pr" className="flex-1 overflow-y-auto mt-0">
        <PRTab pr={pr} />
      </TabsContent>
      <TabsContent value="chat" className="flex-1 overflow-hidden mt-0">
        <ChatTab comments={comments} onPostComment={onPostComment} />
      </TabsContent>
      <TabsContent value="commits" className="flex-1 overflow-y-auto mt-0">
        <CommitsTab
          commits={commits}
          activeCommit={activeCommit}
          onSelectCommit={onSelectCommit}
        />
      </TabsContent>
    </Tabs>
  );
}
