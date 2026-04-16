import * as React from "react";
import { cn } from "../../lib/utils";

interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

function Kbd({ className, children, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center px-1.5 py-0.5",
        "bg-zen-elevated border border-zen-border rounded text-2xs font-mono",
        "text-zen-muted min-w-[1.25rem]",
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}

export { Kbd };
