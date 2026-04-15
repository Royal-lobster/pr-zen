import { useState, useEffect, useRef, useMemo } from "react";
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

  if (!open) return null;

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
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-[500px] bg-zen-surface border border-zen-border rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search files and commands..."
          className="w-full px-4 py-3 bg-transparent text-sm text-zen-text placeholder:text-zen-muted/50 border-b border-zen-border focus:outline-none"
        />
        <div className="max-h-[300px] overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-3 text-sm text-zen-muted">
              No results found.
            </div>
          )}
          {filtered.map((item, i) => (
            <button
              key={item.id}
              onClick={item.action}
              className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between transition-colors ${
                i === selectedIndex
                  ? "bg-zen-accent/10 text-zen-text"
                  : "text-zen-muted hover:bg-zen-surface"
              }`}
            >
              <span className="truncate">{item.label}</span>
              {item.shortcut && (
                <kbd className="ml-2 text-xs text-zen-muted/60 shrink-0">
                  {item.shortcut}
                </kbd>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
