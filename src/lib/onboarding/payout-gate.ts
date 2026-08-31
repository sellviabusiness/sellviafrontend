import { getOnboardingRecord } from "./store";

/**
 * C4's blocking-state check, factored out as a small standalone export so Feature 4 (My Links,
 * Discover, or wherever a creator's affiliate links get generated) can gate link activation
 * without reaching into onboarding internals or duplicating this logic. Deliberately NOT wired
 * into any Feature 4 screen yet — Feature 4 is out of scope for this task; this is only the
 * shared status surface it will consume.
 */
export function isPayoutActive(email: string): boolean {
  return getOnboardingRecord(email)?.payoutStatus === "connected";
}

export const PAYOUT_INCOMPLETE_MESSAGE = "Finish payout setup to activate your links.";
