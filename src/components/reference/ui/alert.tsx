import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Request-level status banner (form-wide error/info/success). Per Docs/UX/Copy Guidelines,
 * copy shown inside must be specific and actionable — never a generic "Something went wrong."
 * `role`/`aria-live` make async status changes announced to screen readers (Docs/UX/Accessibility).
 */
export function Alert({
  className,
  variant = "error",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: "error" | "info" | "success" }) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={cn(
        "rounded-[var(--radius-sm)] border px-4 py-3 text-sm",
        variant === "error" &&
          "border-danger-border bg-danger-bg text-danger",
        variant === "success" && "border-border text-success",
        variant === "info" && "border-border text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
