import type { ReactNode } from "react";

/**
 * Single centered auth page shell — no split-screen, no brand panel. Same shape for all five
 * screens: a compact, reasonably-capped-width column, vertically centered, comfortable but not
 * excessive page padding. Logo + theme toggle live inside AuthCard, not here.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 sm:px-6">
      <div className="w-full max-w-[400px]">{children}</div>
    </div>
  );
}
