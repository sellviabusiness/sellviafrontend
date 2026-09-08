import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Same border/radius/focus treatment as Input, multi-line. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  ({ className, invalid, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "min-h-24 w-full rounded-[var(--radius-sm)] border border-border bg-transparent px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground-2 outline-none transition-colors",
          "hover:border-border-hover",
          "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          invalid && "border-danger-border focus-visible:ring-danger",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";
