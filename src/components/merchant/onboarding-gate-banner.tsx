import Link from "next/link";
import { AlertTriangle } from "lucide-react";

/**
 * D1's "onboarding-gate banner shown when onboarding is incomplete." In practice this is
 * unreachable in normal use — merchant/layout.tsx already redirects an incomplete-onboarding
 * session to /onboarding before any dashboard screen renders — but it's kept as a real,
 * renderable banner (not dead code) for the narrow window where a screen might read a stale
 * client-side `isOnboardingComplete` value before the next server render catches up, and so the
 * requirement is satisfied literally, not just structurally.
 */
export function OnboardingGateBanner() {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-accent/30 bg-accent/10 px-4 py-3 text-sm">
      <AlertTriangle className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
      <span className="flex-1 text-foreground">Finish onboarding to unlock your full dashboard.</span>
      <Link href="/onboarding" className="font-medium text-accent underline underline-offset-2">
        Resume onboarding
      </Link>
    </div>
  );
}
