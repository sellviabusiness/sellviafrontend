import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const inputClasses = (invalid: boolean | undefined, hasIcon: boolean, className?: string) =>
  cn(
    "h-11 w-full rounded-[var(--radius-sm)] border border-border bg-transparent text-sm text-foreground placeholder:text-muted-foreground-2 outline-none transition-colors",
    hasIcon ? "pl-10 pr-3.5" : "px-3.5",
    "hover:border-border-hover",
    "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:cursor-not-allowed disabled:opacity-50",
    invalid && "border-danger-border focus-visible:ring-danger",
    className,
  );

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; icon?: ReactNode }
>(({ className, invalid, icon, ...props }, ref) => {
  if (icon) {
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground-2">
          {icon}
        </span>
        <input
          ref={ref}
          aria-invalid={invalid || undefined}
          className={inputClasses(invalid, true, className)}
          {...props}
        />
      </div>
    );
  }

  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={inputClasses(invalid, false, className)}
      {...props}
    />
  );
});
Input.displayName = "Input";
