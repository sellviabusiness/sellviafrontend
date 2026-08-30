import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Underlined inline link used throughout the auth screens (nav between screens, "Back to login"). */
export function AuthLink({
  href,
  children,
  className,
  emphasis = false,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  /** Bold/foreground-colored vs. the default muted weight. */
  emphasis?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "underline underline-offset-4",
        emphasis ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {children}
    </Link>
  );
}
