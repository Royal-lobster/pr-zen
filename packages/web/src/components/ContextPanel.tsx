import { useState } from "react";
import { PRTab } from "./PRTab";
import { ChatTab } from "./ChatTab";
import { CommitsTab } from "./CommitsTab";
import type { PRComment, PRCommit, PRMetadata } from "../lib/api";

interface ContextPanelProps {
  pr: PRMetadata;
  comments: PRComment[];
  commits: PRCommit[];
  activeCommit: string | null;
  onSelectCommit: (sha: string | null) => void;
  onPostComment: (body: string) => Promise<void>;
}

type Tab = "pr" | "chat" | "commits";

export function ContextPanel({
  pr,
  comments,
  commits,
  activeCommit,
  onSelectCommit,
  onPostComment,
}: ContextPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("pr");

  const tabs: { id: Tab; label: string }[] = [
    { id: "pr", label: "PR" },
    { id: "chat", label: "Chat" },
    { id: "commits", label: "Commits" },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b border-zen-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-xs font-medium text-center transition-colors ${
              activeTab === tab.id
                ? "text-zen-accent border-b-2 border-zen-accent"
                : "text-zen-muted hover:text-zen-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {activeTab === "pr" && <PRTab pr={pr} />}
        {activeTab === "chat" && (
          <ChatTab comments={comments} onPostComment={onPostComment} />
        )}
        {activeTab === "commits" && (
          <CommitsTab
            commits={commits}
            activeCommit={activeCommit}
            onSelectCommit={onSelectCommit}
          />
        )}
      </div>
    </div>
  );
}
