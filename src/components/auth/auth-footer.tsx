import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Centered text row below the auth card — nav to the sibling auth screen. */
export function AuthFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("mt-4 text-center text-sm text-muted-foreground", className)}>{children}</p>
  );
}
