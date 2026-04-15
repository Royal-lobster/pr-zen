import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface ShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  { key: "j / k", description: "Next / previous file" },
  { key: "x", description: "Mark current file reviewed" },
  { key: "v", description: "Toggle split/unified diff" },
  { key: "Cmd+K", description: "Command palette" },
  { key: "Cmd+[", description: "Toggle left sidebar" },
  { key: "Cmd+]", description: "Toggle right sidebar" },
  { key: "Esc", description: "Close overlay / cancel" },
  { key: "?", description: "Show this help" },
];

export function ShortcutsHelp({ open, onClose }: ShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <Separator />
        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {s.description}
              </span>
              <kbd className="px-2 py-0.5 bg-secondary border border-border rounded text-xs text-foreground">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
        <div className="mt-2 text-center">
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Press Esc to close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
