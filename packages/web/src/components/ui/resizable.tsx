import * as React from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { cn } from "../../lib/utils";

export type {
  GroupProps as ResizablePanelGroupProps,
  PanelProps as ResizablePanelProps,
  SeparatorProps as ResizableHandleProps,
  PanelImperativeHandle,
  GroupImperativeHandle,
} from "react-resizable-panels";

export const ResizablePanelGroup = React.forwardRef<
  React.ComponentRef<typeof Group>,
  React.ComponentPropsWithoutRef<typeof Group>
>(({ className, ...props }, ref) => (
  <Group
    ref={ref}
    className={cn("flex h-full w-full", className)}
    {...props}
  />
));
ResizablePanelGroup.displayName = "ResizablePanelGroup";

export const ResizablePanel = Panel;

export const ResizableHandle = React.forwardRef<
  React.ComponentRef<typeof Separator>,
  React.ComponentPropsWithoutRef<typeof Separator>
>(({ className, ...props }, ref) => (
  <Separator
    ref={ref}
    className={cn(
      "relative w-px bg-zen-border transition-colors",
      "data-[separator]:hover:bg-zen-accent data-[separator]:active:bg-zen-accent",
      "data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full",
      className
    )}
    {...props}
  />
));
ResizableHandle.displayName = "ResizableHandle";
