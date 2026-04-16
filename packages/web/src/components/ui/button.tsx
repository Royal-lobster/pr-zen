import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-xs font-medium transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 rounded-lg",
  {
    variants: {
      variant: {
        primary:
          "bg-zen-accent text-zen-bg hover:bg-zen-accent-hover shadow-glow-sm hover:shadow-glow",
        ghost:
          "text-zen-muted hover:text-zen-text hover:bg-zen-elevated",
        outline:
          "border border-zen-border text-zen-text-secondary hover:bg-zen-elevated hover:text-zen-text",
        danger:
          "bg-zen-del-text/10 text-zen-del-text hover:bg-zen-del-text/20 border border-zen-del-border",
      },
      size: {
        sm: "h-7 px-2.5 text-2xs",
        default: "h-8 px-3",
        lg: "h-9 px-4 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
