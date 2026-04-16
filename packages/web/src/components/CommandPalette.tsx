import { useState, useEffect, useRef, useMemo } from "react";
import { Search, FileText, Zap } from "lucide-react";
import { Kbd } from "./ui/kbd";
import { cn } from "../lib/utils";
import type { PRFile } from "../lib/api";

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  files: PRFile[];
  onFileSelect: (path: string) => void;
  commands: Command[];
}

export type { Command };

export function CommandPalette({
  open,
  onClose,
  files,
  onFileSelect,
  commands,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const allItems = useMemo(() => {
    const fileItems: Command[] = files.map((f) => ({
      id: `file:${f.path}`,
      label: f.path,
      action: () => {
        onFileSelect(f.path);
        onClose();
      },
    }));
    return [...commands, ...fileItems];
  }, [files, commands, onFileSelect, onClose]);

  const filtered = useMemo(() => {
    if (!query) return allItems;
    const lower = query.toLowerCase();
    return allItems.filter((item) => item.label.toLowerCase().includes(lower));
  }, [allItems, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selected = list.children[selectedIndex] as HTMLElement | undefined;
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!open) return null;

  const isFile = (id: string) => id.startsWith("file:");

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-[520px] bg-zen-surface border border-zen-border rounded-xl shadow-overlay overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zen-border">
          <Search className="w-4 h-4 text-zen-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files and commands..."
            className="flex-1 bg-transparent text-sm text-zen-text placeholder:text-zen-muted/40 focus:outline-none font-mono"
          />
          <Kbd>esc</Kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[320px] overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-zen-muted">No results for &ldquo;{query}&rdquo;</p>
            </div>
          )}
          {filtered.map((item, i) => (
            <button
              key={item.id}
              onClick={item.action}
              className={cn(
                "w-full text-left px-4 py-2 flex items-center gap-3 transition-colors duration-75",
                i === selectedIndex
                  ? "bg-zen-accent-dim text-zen-text"
                  : "text-zen-text-secondary hover:bg-zen-elevated/50"
              )}
            >
              {isFile(item.id) ? (
                <FileText className="w-3.5 h-3.5 text-zen-muted shrink-0" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-zen-accent shrink-0" />
              )}
              <span className={cn(
                "truncate text-[13px]",
                isFile(item.id) ? "font-mono" : "font-sans"
              )}>
                {item.label}
              </span>
              {item.shortcut && (
                <Kbd className="ml-auto shrink-0">{item.shortcut}</Kbd>
              )}
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-zen-border text-2xs text-zen-muted">
          <span className="flex items-center gap-1">
            <Kbd>{"\u2191"}</Kbd><Kbd>{"\u2193"}</Kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <Kbd>{"\u21B5"}</Kbd> select
          </span>
        </div>
      </div>
    </div>
  );
}
