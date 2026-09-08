"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PartyPopper } from "lucide-react";
import { OnboardingLayout } from "@/components/onboarding/onboarding-layout";
import { Button } from "@/components/reference/ui/button";
import { useOnboardingStep } from "@/components/onboarding/use-onboarding-step";
import { authProvider } from "@/lib/auth/provider";
import { isMockMode } from "@/lib/auth/config";
import { markClerkOnboardingComplete } from "@/app/actions/clerk-profile";
import { markOnboardingComplete } from "@/lib/onboarding/store";

/**
 * Reaching this screen at all already means every prior required step passed the unlock guard
 * (useOnboardingStep redirects elsewhere otherwise) — so it's correct to mark onboarding
 * complete on arrival, not deferred to the button click. The button only navigates; the gate
 * that actually matters is /dashboard's own server-side check (lib/onboarding/status.ts), which
 * reads the session's own onboardingComplete flag — set here via authProvider.markOnboardingComplete
 * (mock) / markClerkOnboardingComplete (clerk), both real, session-native writes. No side-channel
 * cookie any more — see status.ts's own doc comment for the bug that fallback caused.
 */
export function CompleteView({ email, id, sessionRoles }: { email: string; id: string; sessionRoles: string[] }) {
  const router = useRouter();
  const { ready, roles } = useOnboardingStep("complete", email, id, sessionRoles);
  // ROOT CAUSE FOUND LIVE (same class as the registration-time role write — see
  // clerk-register-form.tsx's own doc comment on updateClerkRoles): both branches here used to
  // fire the session-marking write with a bare `void`, never awaited, while the "Go to Dashboard"
  // button was independently enabled the instant `ready` became true — nothing actually kept
  // the write and the button in order. The synchronous cookie fallback (still set below) mostly
  // papered over it for THIS screen specifically, but "mostly" isn't "always": a slow write plus
  // a fast click could still land on /dashboard before the session itself reflects completion.
  // `marked` closes it the same way the registration fix did — gate the navigation on the write
  // actually finishing, not just on the step being reachable.
  const [marked, setMarked] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    markOnboardingComplete(email);
    (async () => {
      if (isMockMode) {
        await authProvider.markOnboardingComplete(email);
      } else {
        await markClerkOnboardingComplete().catch(() => {});
      }
      if (!cancelled) setMarked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, email]);

  return (
    <OnboardingLayout step="complete" roles={roles}>
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <PartyPopper className="h-8 w-8 text-accent-foreground" aria-hidden="true" />
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">
          You&apos;re all set! 🎉
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">Your SellVia account is ready.</p>
        {/* This CTA is the handoff point into Feature 3's App Shell/Dashboard — reusing the
            existing /dashboard route (Feature 1's placeholder), per the explicit Feature 3
            boundary: this task routes into it, it doesn't rebuild it. */}
        <Button
          className="mt-2 w-full"
          onClick={() => router.push("/dashboard")}
          disabled={!ready || !marked}
          loading={ready && !marked}
        >
          Go to Dashboard
        </Button>
      </div>
    </OnboardingLayout>
  );
}
