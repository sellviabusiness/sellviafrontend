import type {
  OnboardingRecord,
  CommonProfile,
  MerchantDetails,
  CreatorDetails,
  PayoutData,
  ConnectionStatus,
} from "./types";

/**
 * MOCK DATA LAYER — Onboarding.
 *
 * Stands in for:
 *   GET   /onboarding                       — current OnboardingRecord for the session's account
 *   POST  /onboarding/roles                 — saveRoles          { roles: string[] }
 *   PATCH /onboarding/profile               — saveCommonProfile  { fullName, country, phone }
 *   PATCH /onboarding/merchant              — saveMerchantDetails MerchantDetails
 *   PATCH /onboarding/creator               — saveCreatorDetails  CreatorDetails
 *   PATCH /onboarding/payout                — savePayout          PayoutData
 *   PATCH /onboarding/billing-status        — saveBillingStatus         { status: ConnectionStatus }
 *   PATCH /onboarding/store-connection      — saveStoreConnectionStatus { status, error? }
 *   PATCH /onboarding/payout-status         — savePayoutStatus          { status: ConnectionStatus }
 *   POST  /onboarding/complete              — markOnboardingComplete (no body)
 *
 * Request/response shapes: the `OnboardingRecord`/`CommonProfile`/`MerchantDetails`/
 * `CreatorDetails`/`PayoutData` types this file already imports from ./types.ts are the intended
 * contract — every save* function's parameter type IS the PATCH body shape.
 *
 * Known mock-only deviation: every function takes `email` explicitly to key the localStorage
 * record — a real client calls these with no user param at all (identity comes from the session/
 * JWT the request carries); drop `email` from every call site when wiring the real API.
 *
 * DEV-ONLY frontend state, same pattern as lib/auth/mock/user-store.ts — a localStorage-backed
 * record per account, organized so a real backend integration later is a straight swap: each
 * step already saves its own clearly-separated slice (commonProfile / merchant / creator /
 * payout) instead of one flat blob.
 */
const KEY = "sellvia_onboarding";

function readAll(): Record<string, OnboardingRecord> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, OnboardingRecord>) : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, OnboardingRecord>) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(all));
}

function emailKey(email: string) {
  return email.toLowerCase();
}

export function getOnboardingRecord(email: string): OnboardingRecord | null {
  return readAll()[emailKey(email)] ?? null;
}

function upsert(email: string, patch: Partial<OnboardingRecord>): OnboardingRecord {
  const all = readAll();
  const key = emailKey(email);
  const existing: OnboardingRecord = all[key] ?? { email, roles: [], complete: false };
  const updated: OnboardingRecord = { ...existing, ...patch };
  all[key] = updated;
  writeAll(all);
  return updated;
}

export function saveRoles(email: string, roles: string[]): OnboardingRecord {
  return upsert(email, { roles });
}

export function saveCommonProfile(email: string, data: CommonProfile): OnboardingRecord {
  return upsert(email, { commonProfile: data });
}

export function saveMerchantDetails(email: string, data: MerchantDetails): OnboardingRecord {
  return upsert(email, { merchant: data });
}

export function saveCreatorDetails(email: string, data: CreatorDetails): OnboardingRecord {
  return upsert(email, { creator: data });
}

export function savePayout(email: string, data: PayoutData): OnboardingRecord {
  return upsert(email, { payout: data });
}

/** C2 — billing connect adapter status, see lib/onboarding/integrations/billing.ts. */
export function saveBillingStatus(email: string, status: ConnectionStatus): OnboardingRecord {
  return upsert(email, { billingStatus: status });
}

/** C3 — Shopify store connect adapter status, see lib/onboarding/integrations/shopify.ts. */
export function saveStoreConnectionStatus(
  email: string,
  status: ConnectionStatus,
  error?: string,
): OnboardingRecord {
  return upsert(email, { storeConnectionStatus: status, storeConnectionError: error });
}

/** C4 — payout activation status, see lib/onboarding/integrations/payout-provider.ts and
 *  lib/onboarding/payout-gate.ts (the Feature-4-facing consumer of this). */
export function savePayoutStatus(email: string, status: ConnectionStatus): OnboardingRecord {
  return upsert(email, { payoutStatus: status });
}

export function markOnboardingComplete(email: string): OnboardingRecord {
  return upsert(email, { complete: true });
}
