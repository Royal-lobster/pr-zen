import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
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
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        menuRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        title="Diff display options"
      >
        <Sliders className="w-3.5 h-3.5" />
      </Button>
      {open && pos && createPortal(
        <div
          ref={menuRef}
          style={{ top: pos.top, right: pos.right }}
          className={cn(
            "fixed z-50 w-56",
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
        </div>,
        document.body
      )}
    </>
  );
}
