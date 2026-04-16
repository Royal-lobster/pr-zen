import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Kbd } from "./ui/kbd";

interface ShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

const shortcutGroups = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["j"], description: "Next file" },
      { keys: ["k"], description: "Previous file" },
      { keys: ["\u2318", "K"], description: "Command palette" },
    ],
  },
  {
    title: "Review",
    shortcuts: [
      { keys: ["x"], description: "Toggle file reviewed" },
    ],
  },
  {
    title: "Layout",
    shortcuts: [
      { keys: ["\u2318", "["], description: "Toggle file tree" },
      { keys: ["\u2318", "]"], description: "Toggle context panel" },
    ],
  },
  {
    title: "General",
    shortcuts: [
      { keys: ["?"], description: "This help" },
      { keys: ["esc"], description: "Close / cancel" },
    ],
  },
];

export function ShortcutsHelp({ open, onClose }: ShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="w-[420px] p-6">
        <div className="flex items-center justify-between mb-5">
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <Kbd>esc</Kbd>
        </div>

        <div className="space-y-5">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-2xs font-medium text-zen-muted uppercase tracking-widest mb-2">
                {group.title}
              </h3>
              <div className="space-y-1.5">
                {group.shortcuts.map((s) => (
                  <div
                    key={s.description}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-[13px] text-zen-text-secondary">
                      {s.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((key, i) => (
                        <span key={i} className="flex items-center gap-0.5">
                          <Kbd>{key}</Kbd>
                          {i < s.keys.length - 1 && (
                            <span className="text-zen-muted/40 text-2xs">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
