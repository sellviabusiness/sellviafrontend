"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getOnboardingRecord } from "@/lib/onboarding/store";
import { getEffectiveRoles, isStepUnlocked, nextIncompleteStep, STEP_PATH } from "@/lib/onboarding/steps";
import type { OnboardingRecord, StepId } from "@/lib/onboarding/types";

/**
 * Shared load/guard logic for every step view: reads the localStorage record on mount (can't
 * happen server-side), works out the effective role set, and bounces back to the correct
 * current step if this one's prerequisites aren't actually met yet (someone jumping ahead via a
 * direct URL) — Requirement §8's bypass-prevention, applied within the onboarding flow itself,
 * not just at its /dashboard boundary. Revisiting an *earlier*, already-completed step is never
 * blocked — only jumping ahead is.
 */
export function useOnboardingStep(step: StepId, email: string, sessionRoles: string[]) {
  const router = useRouter();
  const [record, setRecord] = useState<OnboardingRecord | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = getOnboardingRecord(email);
    const roles = getEffectiveRoles(sessionRoles, current);

    if (!isStepUnlocked(step, roles, current)) {
      router.replace(STEP_PATH[nextIncompleteStep(roles, current)]);
      return;
    }

    // localStorage is only readable client-side — this has to be an effect, not derived during
    // render, so the very first (server/pre-hydration) render can stay consistent. Not the
    // "you might not need an effect" derived-state case the rule targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecord(current);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally runs once per step/email
  }, [step, email]);

  return {
    record,
    ready,
    roles: getEffectiveRoles(sessionRoles, record),
    refresh: () => setRecord(getOnboardingRecord(email)),
  };
}
