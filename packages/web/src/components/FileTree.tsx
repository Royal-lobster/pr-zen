import { useState, useMemo, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  File,
  FileCode,
  Folder,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface TreeNode {
  name: string;
  path: string;
  children: Map<string, TreeNode>;
  file: PRFile | null;
}

const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

const statusLabels: Record<string, string> = {
  added: "A",
  modified: "M",
  removed: "D",
  renamed: "R",
};

const statusColors: Record<string, string> = {
  added: "text-[hsl(var(--diff-add-text))]",
  modified: "text-primary",
  removed: "text-[hsl(var(--diff-del-text))]",
  renamed: "text-yellow-400",
};

function buildTree(files: PRFile[]): TreeNode {
  const root: TreeNode = { name: "", path: "", children: new Map(), file: null };

  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          children: new Map(),
          file: isFile ? file : null,
        });
      } else if (isFile) {
        current.children.get(part)!.file = file;
      }

      current = current.children.get(part)!;
    }
  }

  return root;
}

function collectAllDirs(node: TreeNode): Set<string> {
  const dirs = new Set<string>();

  function walk(n: TreeNode) {
    if (n.children.size > 0 && n.path) {
      dirs.add(n.path);
    }
    for (const child of n.children.values()) {
      walk(child);
    }
  }

  walk(node);
  return dirs;
}

function getSortedChildren(node: TreeNode): TreeNode[] {
  const children = Array.from(node.children.values());
  return children.sort((a, b) => {
    const aIsDir = a.children.size > 0;
    const bIsDir = b.children.size > 0;
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return a.name.localeCompare(b.name);
  });
}

function isCodeFile(name: string): boolean {
  const dot = name.lastIndexOf(".");
  if (dot === -1) return false;
  return CODE_EXTENSIONS.has(name.slice(dot));
}

function DirectoryNode({
  node,
  depth,
  expanded,
  onToggleExpand,
  currentFile,
  isReviewed,
  onToggleReviewed,
  onFileClick,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggleExpand: (path: string) => void;
  currentFile: string | null;
  isReviewed: (path: string) => boolean;
  onToggleReviewed: (path: string) => void;
  onFileClick: (path: string) => void;
}) {
  const isExpanded = expanded.has(node.path);

  return (
    <div>
      <button
        onClick={() => onToggleExpand(node.path)}
        className={cn(
          "flex items-center gap-1.5 w-full px-2 py-1 text-sm text-muted-foreground hover:bg-muted/50 transition-colors rounded-sm",
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        )}
        {isExpanded ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-primary/70" />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-primary/70" />
        )}
        <span className="truncate font-medium">{node.name}</span>
      </button>

      {isExpanded && (
        <div>
          {getSortedChildren(node).map((child) =>
            child.children.size > 0 ? (
              <DirectoryNode
                key={child.path}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                onToggleExpand={onToggleExpand}
                currentFile={currentFile}
                isReviewed={isReviewed}
                onToggleReviewed={onToggleReviewed}
                onFileClick={onFileClick}
              />
            ) : child.file ? (
              <FileNode
                key={child.path}
                node={child}
                depth={depth + 1}
                currentFile={currentFile}
                isReviewed={isReviewed}
                onToggleReviewed={onToggleReviewed}
                onFileClick={onFileClick}
              />
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}

function FileNode({
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
  const file = node.file!;
  const reviewed = isReviewed(file.path);
  const isCurrent = file.path === currentFile;
  const codeFile = isCodeFile(node.name);

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 py-1 pr-2 cursor-pointer text-sm transition-colors rounded-sm group",
        isCurrent
          ? "bg-primary/10 text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onClick={() => onFileClick(file.path)}
    >
      <Checkbox
        checked={reviewed}
        onCheckedChange={() => onToggleReviewed(file.path)}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className="h-3.5 w-3.5 shrink-0"
      />
      <span
        className={cn(
          "text-[10px] font-mono font-semibold shrink-0 w-3 text-center",
          statusColors[file.status] ?? "text-muted-foreground",
        )}
      >
        {statusLabels[file.status] ?? "?"}
      </span>
      {codeFile ? (
        <FileCode className="h-4 w-4 shrink-0 text-muted-foreground/70" />
      ) : (
        <File className="h-4 w-4 shrink-0 text-muted-foreground/70" />
      )}
      <span
        className={cn(
          "truncate",
          reviewed && "line-through opacity-50",
        )}
      >
        {node.name}
      </span>
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
  const tree = useMemo(() => buildTree(files), [files]);
  const allDirs = useMemo(() => collectAllDirs(tree), [tree]);
  const [expanded, setExpanded] = useState<Set<string>>(allDirs);

  // When files change, ensure any new directories are expanded by default
  useMemo(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const dir of allDirs) {
        next.add(dir);
      }
      return next;
    });
  }, [allDirs]);

  const onToggleExpand = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Flatten single-child directory chains for cleaner display
  const effectiveRoot = useMemo(() => {
    let root = tree;
    // If the root has a single directory child, skip down
    while (root.children.size === 1) {
      const only = root.children.values().next().value!;
      if (only.children.size === 0) break;
      root = { ...root, children: root.children };
      break;
    }
    return root;
  }, [tree]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Files
        </span>
        <button
          onClick={onToggleMode}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          title={`Switch to ${mode === "bottom-up" ? "top-down" : "bottom-up"}`}
        >
          {mode === "bottom-up" ? "\u2191 bottom-up" : "\u2193 top-down"}
        </button>
      </div>
      <ScrollArea className="flex-1">
        <div className="py-1">
          {getSortedChildren(effectiveRoot).map((child) =>
            child.children.size > 0 ? (
              <DirectoryNode
                key={child.path}
                node={child}
                depth={0}
                expanded={expanded}
                onToggleExpand={onToggleExpand}
                currentFile={currentFile}
                isReviewed={isReviewed}
                onToggleReviewed={onToggleReviewed}
                onFileClick={onFileClick}
              />
            ) : child.file ? (
              <FileNode
                key={child.path}
                node={child}
                depth={0}
                currentFile={currentFile}
                isReviewed={isReviewed}
                onToggleReviewed={onToggleReviewed}
                onFileClick={onFileClick}
              />
            ) : null,
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
