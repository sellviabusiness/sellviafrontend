import type {
  OnboardingRecord,
  CommonProfile,
  MerchantDetails,
  CreatorDetails,
  ConnectionStatus,
} from "./types";

/**
 * MOCK DATA LAYER — Onboarding.
 *
 * CORRECTION — this file itself is `localStorage`-only in every mode, but several of the *step
 * views* that call it (business-view.tsx, creator-profile-view.tsx, store-connect-view.tsx) also
 * make a REAL `apiRequest` call of their own, gated on `!isMockMode`, in addition to (not instead
 * of) the local save here — this file's own record is still what the UI reads back for prefill/
 * step-completion regardless of mode. So "stands in for" below is only accurate for `roles`,
 * `commonProfile` (phone has no backend column at all), and `complete` (tracked for real, but on
 * Clerk's own `publicMetadata.onboardingComplete`, not this API). Merchant/creator role-grant and
 * Shopify-connect already have real endpoints; billing-connect had no real equivalent to build
 * against (Payments/Payment Flow.md's invoice model) and payout moved out of onboarding entirely
 * (Creator Settings → Payout, its own real GET/PATCH /users/creator-profile/payout-method) — both
 * removed as onboarding steps outright rather than wired to anything here.
 *
 * Stands in for:
 *   GET   /onboarding                       — current OnboardingRecord for the session's account
 *   POST  /onboarding/roles                 — saveRoles          { roles: string[] }
 *   PATCH /onboarding/profile               — saveCommonProfile  { fullName, phone }
 *   PATCH /onboarding/merchant              — saveMerchantDetails MerchantDetails
 *   PATCH /onboarding/creator               — saveCreatorDetails  CreatorDetails
 *   PATCH /onboarding/store-connection      — saveStoreConnectionStatus { status, error? }
 *   PATCH /onboarding/payout-status         — savePayoutStatus          { status: ConnectionStatus }
 *   POST  /onboarding/complete              — markOnboardingComplete (no body)
 *
 * Request/response shapes: the `OnboardingRecord`/`CommonProfile`/`MerchantDetails`/
 * `CreatorDetails` types this file already imports from ./types.ts are the intended contract —
 * every save* function's parameter type IS the PATCH body shape.
 *
 * Known mock-only deviation: every function takes `email` explicitly to key the localStorage
 * record — a real client calls these with no user param at all (identity comes from the session/
 * JWT the request carries); drop `email` from every call site when wiring the real API.
 * `ensureRecordForAccount` (below) is the one exception/mock-only concern that has no real-API
 * equivalent at all — a real backend keys onboarding progress by account id natively, so this
 * whole problem (and function) disappears once that swap happens.
 *
 * DEV-ONLY frontend state, same pattern as lib/auth/mock/user-store.ts — a localStorage-backed
 * record per account, organized so a real backend integration later is a straight swap: each
 * step already saves its own clearly-separated slice (commonProfile / merchant / creator)
 * instead of one flat blob.
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

/**
 * ROOT CAUSE FOUND LIVE — every record here was keyed by email alone, nothing tying it to a
 * specific ACCOUNT. Delete a Clerk user and sign up again with the same email (routine during
 * testing; possible in production too) and the new account silently inherited the old one's
 * entire onboarding progress from localStorage — roles, "Shopify connected", billing status,
 * all of it — since nothing here could tell the two apart. This had already been patched twice
 * at individual symptoms (the old role-select screen, the onboarding-complete cookie); this is
 * the one place that actually closes it for every step, including ones not yet reported (billing
 * and payout have the identical exposure, just not hit yet).
 *
 * Called on every onboarding step's mount (useOnboardingStep) — cheap and a no-op once the
 * record's `id` already matches, so no "only run once" gate is needed the way role-select's
 * auto-skip fix needed one.
 */
export function ensureRecordForAccount(email: string, accountId: string): void {
  const all = readAll();
  const key = emailKey(email);
  if (all[key]?.id === accountId) return;
  all[key] = { email, id: accountId, roles: [], complete: false };
  writeAll(all);
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
