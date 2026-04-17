import { useState, useRef, useEffect } from "react";
import { Sliders, Check } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

interface DiffOptionsMenuProps {
  diffStyle: "unified" | "split";
  wordWrap: boolean;
  onToggleDiffStyle: () => void;
  onToggleWordWrap: () => void;
}

export function DiffOptionsMenu({
  diffStyle,
  wordWrap,
  onToggleDiffStyle,
  onToggleWordWrap,
}: DiffOptionsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        title="Diff display options"
      >
        <Sliders className="w-3.5 h-3.5" />
      </Button>
      {open && (
        <div
          className={cn(
            "absolute right-0 top-full mt-1 z-20 w-56",
            "bg-zen-elevated border border-zen-border rounded-lg shadow-overlay",
            "p-1 animate-fade-in"
          )}
        >
          <button
            onClick={() => {
              if (diffStyle !== "unified") onToggleDiffStyle();
              setOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md",
              "text-xs text-left hover:bg-zen-surface transition-colors"
            )}
          >
            <Check
              className={cn(
                "w-3 h-3 shrink-0",
                diffStyle === "unified" ? "opacity-100" : "opacity-0"
              )}
            />
            Unified diff
          </button>
          <button
            onClick={() => {
              if (diffStyle !== "split") onToggleDiffStyle();
              setOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md",
              "text-xs text-left hover:bg-zen-surface transition-colors"
            )}
          >
            <Check
              className={cn(
                "w-3 h-3 shrink-0",
                diffStyle === "split" ? "opacity-100" : "opacity-0"
              )}
            />
            Split diff
          </button>
          <div className="h-px bg-zen-border my-1" />
          <button
            onClick={() => {
              onToggleWordWrap();
            }}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md",
              "text-xs text-left hover:bg-zen-surface transition-colors"
            )}
          >
            <Check
              className={cn(
                "w-3 h-3 shrink-0",
                wordWrap ? "opacity-100" : "opacity-0"
              )}
            />
            Word wrap
          </button>
        </div>
      )}
    </div>
  );
}
