export interface CommonProfile {
  fullName: string;
  email: string;
  country: string;
  phone: string;
}

/** Business category mirrors real-world storefront verticals; product type is the separate
 *  "what do you sell" axis (Physical / Digital) — kept as two distinct fields rather than
 *  merged, matching the spec's explicit split. */
export interface MerchantDetails {
  businessName: string;
  businessCategory: string;
  productType: "physical" | "digital";
  website: string; // required — validated as a real URL by the business-view form before this ever gets saved
}

/** Primary platform + a single handle/link keeps this MVP-simple (spec: "do not force multiple
 *  social platforms"). Niche mirrors the real CreatorProfile field (Docs/Scratch/
 *  SCREEN_INVENTORY.md E8: "Niche, audience size, engagement rate"). */
export interface CreatorDetails {
  primaryPlatform: "instagram" | "tiktok" | "youtube";
  handle: string;
  audienceSize: string;
  niche: string;
  /**
   * Percent, e.g. 4.2. Optional (absent on records from before this field existed) and
   * self-reported/editable via Creator Settings → Profile (Playbook 05 E8) — the self-reported-
   * vs-calculated question is still open per that playbook; this is explicitly the "simplest
   * version, not blocking" self-reported default, with the settings screen itself noting it may
   * be recalculated automatically later.
   */
  engagementRate?: number;
}

/**
 * Dummy payout details only — no real payment processing wired up (explicitly out of scope, and
 * "do NOT pretend a real payment provider integration exists" per the task). Method set is
 * Pakistan-specific per the task's own explicit requirement — PayPal dropped entirely, not kept
 * alongside these. One payout preference per person, shared across Merchant and Creator earnings
 * rather than asked twice on a dual-role account — see Playbook 02 "Design decisions." Shape is
 * deliberately flat/simple so swapping in a real payout provider later (see
 * lib/onboarding/integrations/payout-provider.ts) is a straight field-for-field replacement.
 */
export interface PayoutData {
  method: "bank" | "jazzcash" | "easypaisa";
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
  /** JazzCash/EasyPaisa are mobile-wallet numbers, not bank account fields. */
  mobileWalletNumber?: string;
  mobileWalletAccountName?: string;
}

/**
 * Shared shape for every swappable integration point (C2 billing, C3 store connect, C4 payout
 * activation) — same four states cover "hasn't started" through "provider said no", so the UI
 * (connection-status.tsx) and the gate-status logic (payout-gate.ts) don't need one bespoke
 * status enum per integration.
 */
export type ConnectionStatus = "not_connected" | "connecting" | "connected" | "error";

export type StepId =
  | "role-select"
  | "about-you"
  | "business"
  | "billing"
  | "store-connect"
  | "transition"
  | "creator-profile"
  | "payout"
  | "complete";

export interface OnboardingRecord {
  email: string;
  /** The role(s) this onboarding run covers — from the authenticated session where available,
   *  or self-selected/adjusted on the role-select step (see AuthProvider.updateRoles for how an
   *  actual *change*, not just a confirm, propagates back into the session). */
  roles: string[];
  commonProfile?: CommonProfile;
  merchant?: MerchantDetails;
  creator?: CreatorDetails;
  payout?: PayoutData;
  /** C2 — Switch billing connect. */
  billingStatus?: ConnectionStatus;
  /** C3 — Shopify/store connect. */
  storeConnectionStatus?: ConnectionStatus;
  storeConnectionError?: string;
  /** C4 — the payout *activation* state (post-form-submission), distinct from `payout` (the
   *  form data itself) — see lib/onboarding/integrations/payout-provider.ts. */
  payoutStatus?: ConnectionStatus;
  complete: boolean;
}
