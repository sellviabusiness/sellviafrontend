import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Native <select>, styled to match Input — same border/radius/focus treatment.
 *
 * `bg-input` (a real solid color), not `bg-transparent`: unlike Input/Textarea, a <select>
 * triggers a browser/OS-native popup for its option list, and on some Android WebView/browser
 * combinations a transparent-background select can make that native popup's own background (and
 * therefore its text) render effectively invisible — a documented class of bug matching "dropdown
 * opens empty" reports. An explicit solid background removes that failure mode regardless of
 * platform quirks the sandbox here can't reproduce.
 */
export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(({ className, invalid, children, ...props }, ref) => {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-11 w-full appearance-none rounded-[var(--radius-sm)] border border-border bg-input px-3.5 pr-9 text-sm text-foreground outline-none transition-colors",
          "hover:border-border-hover",
          "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          invalid && "border-danger-border focus-visible:ring-danger",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground-2"
        aria-hidden="true"
      />
    </div>
  );
});
Select.displayName = "Select";
