import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Content card per Docs/UX/Design System: thin border, 12px radius, no shadow. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border border-border bg-card p-8",
        className,
      )}
      {...props}
    />
  );
}
