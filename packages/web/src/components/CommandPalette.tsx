import { useState, useEffect, useMemo } from "react";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "cmdk";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FileCode, Command as CommandIcon } from "lucide-react";
import type { PRFile } from "../lib/api";
import { cn } from "@/lib/utils";

interface CommandDef {
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
  commands: CommandDef[];
}

export type { CommandDef as Command };

export function CommandPalette({
  open,
  onClose,
  files,
  onFileSelect,
  commands,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) {
      setQuery("");
    }
  }, [open]);

  const fileItems = useMemo(
    () =>
      files.map((f) => ({
        id: `file:${f.path}`,
        label: f.path,
        action: () => {
          onFileSelect(f.path);
          onClose();
        },
      })),
    [files, onFileSelect, onClose]
  );

  function handleSelect(value: string) {
    const file = fileItems.find((f) => f.id === value);
    if (file) {
      file.action();
      return;
    }
    const cmd = commands.find((c) => c.id === value);
    if (cmd) {
      cmd.action();
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="overflow-hidden p-0 max-w-[500px] top-[20%] translate-y-0 [&>button]:hidden"
      >
        <Command
          className="bg-transparent"
          filter={(value, search) => {
            const lower = search.toLowerCase();
            const file = fileItems.find((f) => f.id === value);
            if (file) {
              return file.label.toLowerCase().includes(lower) ? 1 : 0;
            }
            const cmd = commands.find((c) => c.id === value);
            if (cmd) {
              return cmd.label.toLowerCase().includes(lower) ? 1 : 0;
            }
            return 0;
          }}
        >
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search files and commands..."
            className="h-11 border-b border-border bg-transparent px-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          />
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty className="px-4 py-3 text-sm text-muted-foreground">
              No results found.
            </CommandEmpty>
            <CommandGroup heading="Files" className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
              {fileItems.map((file) => (
                <CommandItem
                  key={file.id}
                  value={file.id}
                  onSelect={handleSelect}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground cursor-pointer",
                    "aria-selected:bg-accent aria-selected:text-foreground"
                  )}
                >
                  <FileCode className="h-4 w-4 shrink-0" />
                  <span className="truncate">{file.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Commands" className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
              {commands.map((cmd) => (
                <CommandItem
                  key={cmd.id}
                  value={cmd.id}
                  onSelect={handleSelect}
                  className={cn(
                    "flex items-center justify-between px-4 py-2 text-sm text-muted-foreground cursor-pointer",
                    "aria-selected:bg-accent aria-selected:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <CommandIcon className="h-4 w-4 shrink-0" />
                    <span>{cmd.label}</span>
                  </div>
                  {cmd.shortcut && (
                    <kbd className="ml-2 px-1.5 py-0.5 bg-secondary border border-border rounded text-[10px] text-foreground shrink-0">
                      {cmd.shortcut}
                    </kbd>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
