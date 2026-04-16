import { useState, useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "../lib/utils";
import type { PRFile } from "../lib/api";

interface FileTreeProps {
  files: PRFile[];
  currentFile: string | null;
  isReviewed: (path: string) => boolean;
  onToggleReviewed: (path: string) => void;
  onFileClick: (path: string) => void;
  mode: "bottom-up" | "top-down";
  onToggleMode: () => void;
}

const statusColors: Record<string, string> = {
  added: "text-zen-add-text",
  modified: "text-zen-accent",
  removed: "text-zen-del-text",
  renamed: "text-zen-warn",
};

const statusLabels: Record<string, string> = {
  added: "A",
  modified: "M",
  removed: "D",
  renamed: "R",
};

interface FolderGroup {
  dir: string;
  files: PRFile[];
}

function groupByDirectory(files: PRFile[]): FolderGroup[] {
  const groups: Map<string, PRFile[]> = new Map();
  for (const file of files) {
    const dir = file.path.includes("/")
      ? file.path.slice(0, file.path.lastIndexOf("/"))
      : "";
    const existing = groups.get(dir) ?? [];
    existing.push(file);
    groups.set(dir, existing);
  }
  return Array.from(groups, ([dir, files]) => ({ dir, files }));
}

function FolderSection({
  group,
  currentFile,
  isReviewed,
  onToggleReviewed,
  onFileClick,
}: {
  group: FolderGroup;
  currentFile: string | null;
  isReviewed: (path: string) => boolean;
  onToggleReviewed: (path: string) => void;
  onFileClick: (path: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasCurrent = group.files.some((f) => f.path === currentFile);
  const reviewedInGroup = group.files.filter((f) => isReviewed(f.path)).length;
  const allReviewed = reviewedInGroup === group.files.length;

  return (
    <div className="animate-fade-in">
      {group.dir && (
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors group",
            hasCurrent ? "text-zen-text" : "text-zen-muted hover:text-zen-text-secondary"
          )}
        >
          <ChevronRight
            className={cn(
              "w-3 h-3 shrink-0 transition-transform duration-150 text-zen-muted/60",
              open && "rotate-90"
            )}
          />
          <span className="text-2xs font-mono truncate flex-1 tracking-wide">
            {group.dir}/
          </span>
          <span className={cn(
            "text-2xs font-mono tabular-nums",
            allReviewed ? "text-zen-add-text/60" : "text-zen-muted/40"
          )}>
            {reviewedInGroup}/{group.files.length}
          </span>
        </button>
      )}

      {(open || !group.dir) && (
        <div className={group.dir ? "ml-2" : ""}>
          {group.files.map((file) => {
            const fileName = file.path.split("/").pop() ?? file.path;
            const reviewed = isReviewed(file.path);
            const isCurrent = file.path === currentFile;

            return (
              <div
                key={file.path}
                className={cn(
                  "flex items-center gap-2 pl-4 pr-3 py-1 cursor-pointer text-[13px]",
                  "group/file transition-all duration-100 border-l-2",
                  isCurrent
                    ? "bg-zen-accent-dim text-zen-text border-zen-accent"
                    : "text-zen-text-secondary hover:bg-zen-elevated/50 hover:text-zen-text border-transparent"
                )}
                onClick={() => onFileClick(file.path)}
              >
                <Checkbox
                  checked={reviewed}
                  onCheckedChange={() => onToggleReviewed(file.path)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span
                  className={cn(
                    "text-2xs font-mono w-4 text-center shrink-0 font-semibold",
                    statusColors[file.status] ?? "text-zen-muted"
                  )}
                >
                  {statusLabels[file.status] ?? "?"}
                </span>
                <span
                  className={cn(
                    "truncate font-mono text-[13px] transition-opacity",
                    reviewed && "opacity-40 line-through"
                  )}
                >
                  {fileName}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function FileTree({
  files,
  currentFile,
  isReviewed,
  onToggleReviewed,
  onFileClick,
  mode,
  onToggleMode,
}: FileTreeProps) {
  const groups = useMemo(() => groupByDirectory(files), [files]);
  const reviewedCount = files.filter((f) => isReviewed(f.path)).length;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-zen-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zen-text tracking-tight">
            Files
          </span>
          <span className="text-2xs font-mono text-zen-muted tabular-nums">
            {reviewedCount}/{files.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleMode}
          className="font-mono"
          title={`Switch to ${mode === "bottom-up" ? "top-down" : "bottom-up"}`}
        >
          {mode === "bottom-up" ? "\u2191 dep" : "\u2193 dep"}
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="py-1">
          {groups.map((group) => (
            <FolderSection
              key={group.dir || "__root"}
              group={group}
              currentFile={currentFile}
              isReviewed={isReviewed}
              onToggleReviewed={onToggleReviewed}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
