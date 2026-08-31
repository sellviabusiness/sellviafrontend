"use client";

import { PartyPopper } from "lucide-react";
import { useRouter } from "next/navigation";
import { OnboardingLayout } from "@/components/onboarding/onboarding-layout";
import { Button } from "@/components/reference/ui/button";
import { useOnboardingStep } from "@/components/onboarding/use-onboarding-step";
import { STEP_PATH, stepAfter } from "@/lib/onboarding/steps";

/** Dual-role only, static celebration interstitial — no fields, one-directional (no Back). Only
 *  reachable once Merchant onboarding is done; guarded like every other step via
 *  useOnboardingStep so a direct URL hit before that can't skip ahead either. */
export function TransitionView({ email, sessionRoles }: { email: string; sessionRoles: string[] }) {
  const router = useRouter();
  const { ready, roles } = useOnboardingStep("transition", email, sessionRoles);

  function handleContinue() {
    const next = stepAfter("transition", roles) ?? "creator-profile";
    router.push(STEP_PATH[next]);
  }

  return (
    <OnboardingLayout step="transition" roles={roles}>
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <PartyPopper className="h-8 w-8 text-accent" aria-hidden="true" />
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">
          Great! Your merchant profile is ready.
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Now let&apos;s set up your creator profile so you can also promote products and earn commissions.
        </p>
        <Button className="mt-2 w-full" onClick={handleContinue} disabled={!ready}>
          Continue as Creator
        </Button>
      </div>
    </OnboardingLayout>
  );
}
