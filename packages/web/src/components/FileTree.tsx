import { useState, useMemo } from "react";
import { ChevronRight, FolderTree, List } from "lucide-react";
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
  treeMode: "flat" | "tree";
  onToggleTreeMode: () => void;
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

interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[];
  file?: PRFile;
}

function buildTree(files: PRFile[]): TreeNode {
  const root: TreeNode = { name: "", path: "", children: [] };
  const index = new Map<string, TreeNode>();
  index.set("", root);

  for (const file of files) {
    const parts = file.path.split("/");
    let parentPath = "";
    let parent = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const segment = parts[i];
      const nextPath = parentPath ? `${parentPath}/${segment}` : segment;
      let dir = index.get(nextPath);
      if (!dir) {
        dir = { name: segment, path: nextPath, children: [] };
        parent.children.push(dir);
        index.set(nextPath, dir);
      }
      parent = dir;
      parentPath = nextPath;
    }
    const leafName = parts[parts.length - 1];
    parent.children.push({
      name: leafName,
      path: file.path,
      children: [],
      file,
    });
  }

  function sort(node: TreeNode) {
    node.children.sort((a, b) => {
      const aDir = a.children.length > 0 || !a.file;
      const bDir = b.children.length > 0 || !b.file;
      if (aDir !== bDir) return aDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const c of node.children) sort(c);
  }
  sort(root);

  return root;
}

function countReviewedInTree(
  node: TreeNode,
  isReviewed: (path: string) => boolean
): { reviewed: number; total: number } {
  if (node.file) {
    return { reviewed: isReviewed(node.path) ? 1 : 0, total: 1 };
  }
  let reviewed = 0;
  let total = 0;
  for (const c of node.children) {
    const sub = countReviewedInTree(c, isReviewed);
    reviewed += sub.reviewed;
    total += sub.total;
  }
  return { reviewed, total };
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
                title={file.path}
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

function TreeNodeView({
  node,
  depth,
  currentFile,
  isReviewed,
  onToggleReviewed,
  onFileClick,
}: {
  node: TreeNode;
  depth: number;
  currentFile: string | null;
  isReviewed: (path: string) => boolean;
  onToggleReviewed: (path: string) => void;
  onFileClick: (path: string) => void;
}) {
  const [open, setOpen] = useState(true);

  if (node.file) {
    const reviewed = isReviewed(node.path);
    const isCurrent = node.path === currentFile;
    return (
      <div
        title={node.path}
        className={cn(
          "flex items-center gap-2 pr-3 py-1 cursor-pointer text-[13px]",
          "group/file transition-all duration-100 border-l-2",
          isCurrent
            ? "bg-zen-accent-dim text-zen-text border-zen-accent"
            : "text-zen-text-secondary hover:bg-zen-elevated/50 hover:text-zen-text border-transparent"
        )}
        style={{ paddingLeft: `${depth * 12 + 16}px` }}
        onClick={() => onFileClick(node.path)}
      >
        <Checkbox
          checked={reviewed}
          onCheckedChange={() => onToggleReviewed(node.path)}
          onClick={(e) => e.stopPropagation()}
        />
        <span
          className={cn(
            "text-2xs font-mono w-4 text-center shrink-0 font-semibold",
            statusColors[node.file.status] ?? "text-zen-muted"
          )}
        >
          {statusLabels[node.file.status] ?? "?"}
        </span>
        <span
          className={cn(
            "truncate font-mono text-[13px] transition-opacity",
            reviewed && "opacity-40 line-through"
          )}
        >
          {node.name}
        </span>
      </div>
    );
  }

  const { reviewed, total } = countReviewedInTree(node, isReviewed);
  const allReviewed = reviewed === total && total > 0;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-1.5 py-1.5 pr-3 text-left transition-colors group",
          "text-zen-muted hover:text-zen-text-secondary"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <ChevronRight
          className={cn(
            "w-3 h-3 shrink-0 transition-transform duration-150 text-zen-muted/60",
            open && "rotate-90"
          )}
        />
        <span className="text-2xs font-mono truncate flex-1 tracking-wide">
          {node.name}/
        </span>
        <span
          className={cn(
            "text-2xs font-mono tabular-nums",
            allReviewed ? "text-zen-add-text/60" : "text-zen-muted/40"
          )}
        >
          {reviewed}/{total}
        </span>
      </button>
      {open && (
        <div>
          {node.children.map((child) => (
            <TreeNodeView
              key={child.path || child.name}
              node={child}
              depth={depth + 1}
              currentFile={currentFile}
              isReviewed={isReviewed}
              onToggleReviewed={onToggleReviewed}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TreeView({
  files,
  currentFile,
  isReviewed,
  onToggleReviewed,
  onFileClick,
}: {
  files: PRFile[];
  currentFile: string | null;
  isReviewed: (path: string) => boolean;
  onToggleReviewed: (path: string) => void;
  onFileClick: (path: string) => void;
}) {
  const root = useMemo(() => buildTree(files), [files]);
  return (
    <div className="py-1 animate-fade-in">
      {root.children.map((child) => (
        <TreeNodeView
          key={child.path || child.name}
          node={child}
          depth={0}
          currentFile={currentFile}
          isReviewed={isReviewed}
          onToggleReviewed={onToggleReviewed}
          onFileClick={onFileClick}
        />
      ))}
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
  treeMode,
  onToggleTreeMode,
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
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleTreeMode}
            title={`Switch to ${treeMode === "flat" ? "tree" : "flat"} view`}
          >
            {treeMode === "flat" ? (
              <FolderTree className="w-3.5 h-3.5" />
            ) : (
              <List className="w-3.5 h-3.5" />
            )}
          </Button>
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
      </div>
      <ScrollArea className="flex-1">
        {treeMode === "flat" ? (
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
        ) : (
          <TreeView
            files={files}
            currentFile={currentFile}
            isReviewed={isReviewed}
            onToggleReviewed={onToggleReviewed}
            onFileClick={onFileClick}
          />
        )}
      </ScrollArea>
    </div>
  );
}
