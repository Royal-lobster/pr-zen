import { useEffect } from "react";

interface ShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  { key: "j / k", description: "Next / previous file" },
  { key: "x", description: "Mark current file reviewed" },
  { key: "Cmd+K", description: "Command palette" },
  { key: "Cmd+[", description: "Toggle left sidebar" },
  { key: "Cmd+]", description: "Toggle right sidebar" },
  { key: "Esc", description: "Close overlay / cancel" },
  { key: "?", description: "Show this help" },
];

export function ShortcutsHelp({ open, onClose }: ShortcutsHelpProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-[400px] bg-zen-surface border border-zen-border rounded-lg shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold text-zen-text mb-4">
          Keyboard Shortcuts
        </h2>
        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between">
              <span className="text-sm text-zen-muted">{s.description}</span>
              <kbd className="px-2 py-0.5 bg-zen-bg border border-zen-border rounded text-xs text-zen-text">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <button
            onClick={onClose}
            className="text-xs text-zen-muted hover:text-zen-text"
          >
            Press Esc to close
          </button>
        </div>
      </div>
    </div>
  );
}
