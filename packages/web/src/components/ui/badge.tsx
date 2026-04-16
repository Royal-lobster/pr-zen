import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-zen-elevated text-zen-text-secondary border border-zen-border",
        success: "bg-zen-add-text/10 text-zen-add-text border border-zen-add-border",
        destructive: "bg-zen-del-text/10 text-zen-del-text border border-zen-del-border",
        accent: "bg-zen-accent-dim text-zen-accent",
        purple: "bg-zen-purple/10 text-zen-purple border border-zen-purple/20",
        warn: "bg-zen-warn/10 text-zen-warn border border-zen-warn/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
