import type { OnboardingRecord, StepId } from "./types";

/**
 * Ordered step sequence for a given set of roles — merchant-only skips /creator-profile,
 * creator-only skips /business, dual-role runs both with a "transition" celebration screen
 * between them (spec: "complete Merchant onboarding, show a transition screen, then start
 * Creator onboarding"). This is the single source of truth both the step indicator and the
 * route guards use, so "what step comes next" is never computed twice.
 *
 * Design decision: "about-you" is asked once per person, not once per role. The spec describes
 * Merchant and Creator onboarding as two standalone 3-step flows, which read literally would
 * re-ask name/email/phone a second time on a dual-role account. That contradicts the spec's own
 * "don't make the user feel like they're filling out a huge form" principle and the same account
 * only has one identity — so it's shared across the whole run. Flagged here for visibility, not
 * silently guessed.
 *
 * BACKEND CONFIRMED LIVE — the "billing-connect" (C2 Switch) step used to sit between /business
 * and /store-connect. Backend confirmed there's no pre-registration concept to build it against:
 * merchants never connect a payment method up front, Switch bills them per cycle via an invoice
 * paid on demand (Payments/Payment Flow.md) — the real equivalent already exists as its own
 * feature (Merchant → Billing), not an onboarding step. Removed outright, not just skipped.
 *
 * "payout" (C4) was removed the same way, at the same time, by explicit product decision: payout
 * setup moved out of onboarding entirely, into Creator Settings → Payout (already real-wired
 * there, GET/PATCH /users/creator-profile/payout-method) — nothing merchant-side needs it at all
 * (merchants are billed, never paid). `OnboardingRecord.payout`/`payoutStatus` still exist for
 * that settings screen's mock counterpart; only the onboarding step itself is gone.
 */
export function getStepSequence(roles: string[]): StepId[] {
  const isMerchant = roles.includes("merchant");
  const isCreator = roles.includes("creator");
  const steps: StepId[] = ["about-you"];
  if (isMerchant) steps.push("business", "store-connect");
  if (isMerchant && isCreator) steps.push("transition");
  if (isCreator) steps.push("creator-profile");
  steps.push("complete");
  return steps;
}

export const STEP_PATH: Record<StepId, string> = {
  "about-you": "/onboarding/about-you",
  business: "/onboarding/business",
  "store-connect": "/onboarding/store-connect",
  transition: "/onboarding/transition",
  "creator-profile": "/onboarding/creator-profile",
  complete: "/onboarding/complete",
};

export const STEP_LABEL: Record<StepId, string> = {
  "about-you": "About you",
  business: "Your business",
  "store-connect": "Shopify store",
  transition: "Almost there",
  "creator-profile": "Your content",
  complete: "Done",
};

/** Whether `step`'s own prerequisites are satisfied — used to stop a user jumping ahead via a
 *  direct URL (e.g. hitting /onboarding/creator-profile before /onboarding/about-you is filled
 *  in). Going *back* to revise an earlier, already-completed step is always allowed. */
export function isStepUnlocked(step: StepId, roles: string[], record: OnboardingRecord | null): boolean {
  const sequence = getStepSequence(roles);
  const index = sequence.indexOf(step);
  if (index === -1) return false; // step isn't part of this role combination's flow at all
  if (index === 0) return true; // about-you (the first real step) is always reachable

  for (let i = 0; i < index; i++) {
    if (!isStepComplete(sequence[i], record)) return false;
  }
  return true;
}

export function isStepComplete(step: StepId, record: OnboardingRecord | null): boolean {
  if (!record) return false;
  switch (step) {
    case "about-you":
      return Boolean(record.commonProfile);
    case "business":
      return Boolean(record.merchant);
    // C3 — only an actually-connected store lets the flow move on.
    case "store-connect":
      return record.storeConnectionStatus === "connected";
    // Transition is a static celebration screen, not a data step — it's "complete" the instant
    // its real prerequisites (merchant details + store connect) are done, so direct-URL/bypass
    // logic skips straight past it to the next actionable step instead of getting stuck on it.
    case "transition":
      return Boolean(record.merchant) && record.storeConnectionStatus === "connected";
    case "creator-profile":
      return Boolean(record.creator);
    case "complete":
      return record.complete;
  }
}

/** First step in the sequence that isn't done yet — where /onboarding itself redirects to. */
export function nextIncompleteStep(roles: string[], record: OnboardingRecord | null): StepId {
  const sequence = getStepSequence(roles);
  for (const step of sequence) {
    if (!isStepComplete(step, record)) return step;
  }
  return "complete";
}

/** The step immediately after `step` in the role-filtered sequence — what Continue navigates to.
 *  `undefined` at the end of the sequence. */
export function stepAfter(step: StepId, roles: string[]): StepId | undefined {
  const sequence = getStepSequence(roles);
  const index = sequence.indexOf(step);
  return index === -1 ? undefined : sequence[index + 1];
}

/** The step Back navigates to. Skips over "transition" going backward — it's a one-directional
 *  celebration screen with no fields to revise, so Back from creator-profile goes straight to
 *  business instead of bouncing through a static interstitial. */
export function stepBefore(step: StepId, roles: string[]): StepId | undefined {
  const sequence = getStepSequence(roles);
  const index = sequence.indexOf(step);
  if (index <= 0) return undefined;
  const prev = sequence[index - 1];
  if (prev === "transition") return index - 2 >= 0 ? sequence[index - 2] : undefined;
  return prev;
}

/**
 * The roles this onboarding run actually covers: the authenticated session's roles (chosen once,
 * at signup — RoleSelector there, required before an account can be created; there's no
 * onboarding-side role step any more), falling back to a local record's roles only for the
 * unlikely case a session genuinely has none (e.g. an account predating that requirement).
 */
export function getEffectiveRoles(sessionRoles: string[], record: OnboardingRecord | null): string[] {
  return sessionRoles.length > 0 ? sessionRoles : (record?.roles ?? []);
}
