"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PartyPopper } from "lucide-react";
import { OnboardingLayout } from "@/components/onboarding/onboarding-layout";
import { Button } from "@/components/reference/ui/button";
import { useOnboardingStep } from "@/components/onboarding/use-onboarding-step";
import { authProvider } from "@/lib/auth/provider";
import { markOnboardingComplete } from "@/lib/onboarding/store";
import { setOnboardingCompleteCookie } from "@/lib/onboarding/status-cookie";

/**
 * Reaching this screen at all already means every prior required step passed the unlock guard
 * (useOnboardingStep redirects elsewhere otherwise) — so it's correct to mark onboarding
 * complete on arrival, not deferred to the button click. The button only navigates; the gate
 * that actually matters is /dashboard's own server-side check (lib/onboarding/status.ts),
 * which now prefers the session's own onboardingComplete flag — set here via
 * authProvider.markOnboardingComplete (mock: real, re-issues the session cookie; kratos:
 * documented no-op) — over the cookie, which is set alongside it purely as the kratos-mode
 * fallback until a real identity-schema write path exists.
 */
export function CompleteView({ email, sessionRoles }: { email: string; sessionRoles: string[] }) {
  const router = useRouter();
  const { ready, roles } = useOnboardingStep("complete", email, sessionRoles);

  useEffect(() => {
    if (!ready) return;
    markOnboardingComplete(email);
    setOnboardingCompleteCookie(email);
    void authProvider.markOnboardingComplete(email);
  }, [ready, email]);

  return (
    <OnboardingLayout step="complete" roles={roles}>
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <PartyPopper className="h-8 w-8 text-accent" aria-hidden="true" />
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">
          You&apos;re all set! 🎉
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">Your SellVia account is ready.</p>
        {/* This CTA is the handoff point into Feature 3's App Shell/Dashboard — reusing the
            existing /dashboard route (Feature 1's placeholder), per the explicit Feature 3
            boundary: this task routes into it, it doesn't rebuild it. */}
        <Button className="mt-2 w-full" onClick={() => router.push("/dashboard")} disabled={!ready}>
          Go to Dashboard
        </Button>
      </div>
    </OnboardingLayout>
  );
}
