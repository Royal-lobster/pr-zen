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
  renamed: "text-yellow-400",
};

const statusIcons: Record<string, string> = {
  added: "A",
  modified: "M",
  removed: "D",
  renamed: "R",
};

export function FileTree({
  files,
  currentFile,
  isReviewed,
  onToggleReviewed,
  onFileClick,
  mode,
  onToggleMode,
}: FileTreeProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zen-border">
        <span className="text-xs font-medium text-zen-muted uppercase tracking-wide">
          Files
        </span>
        <button
          onClick={onToggleMode}
          className="text-xs text-zen-muted hover:text-zen-text transition-colors"
          title={`Switch to ${mode === "bottom-up" ? "top-down" : "bottom-up"}`}
        >
          {mode === "bottom-up" ? "\u2191 bottom-up" : "\u2193 top-down"}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {files.map((file) => {
          const fileName = file.path.split("/").pop() ?? file.path;
          const dirPath = file.path.includes("/")
            ? file.path.slice(0, file.path.lastIndexOf("/"))
            : "";
          const reviewed = isReviewed(file.path);
          const isCurrent = file.path === currentFile;

          return (
            <div
              key={file.path}
              className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm group transition-colors ${
                isCurrent
                  ? "bg-zen-accent/10 text-zen-text"
                  : "text-zen-muted hover:bg-zen-surface hover:text-zen-text"
              }`}
              onClick={() => onFileClick(file.path)}
            >
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleReviewed(file.path);
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-3.5 w-3.5 rounded border-zen-border accent-zen-accent shrink-0"
              />
              <span
                className={`text-xs font-mono shrink-0 ${statusColors[file.status] ?? "text-zen-muted"}`}
              >
                {statusIcons[file.status] ?? "?"}
              </span>
              <div className="min-w-0 flex-1">
                <span
                  className={`block truncate ${reviewed ? "line-through opacity-50" : ""}`}
                >
                  {fileName}
                </span>
                {dirPath && (
                  <span className="block truncate text-xs text-zen-muted/60">
                    {dirPath}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
