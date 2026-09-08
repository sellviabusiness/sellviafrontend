import type { PayoutRequest, MerchantPayoutMethod } from "@/lib/merchant/types";
import { getCreatorEarningsSummary } from "@/lib/merchant/store";
import { getOnboardingRecord } from "@/lib/onboarding/store";
import { notifyPayoutCompleted } from "@/lib/notifications/mock/store";
import { deriveCreatorId } from "./identity";

/**
 * MOCK DATA LAYER — Creator payouts.
 *
 * Stands in for:
 *   GET   /creator/payouts                — getCreatorPayoutRequests → PayoutRequest[]
 *   POST  /creator/payouts/request         — requestCreatorPayout → PayoutRequest | undefined (undefined = below threshold, real API would 4xx with a reason instead)
 *   PATCH /creator/payouts/:id/paid        — markPayoutRequestPaid (⚠ real-world this is provider-webhook-driven or an Admin action — Playbook 07 G1's time-to-payout metric — not a creator-initiated call; kept here only as the dev "simulate completion" trigger, see Playbook 06 F1)
 *   GET   /creator/payout-method           — getCreatorPayoutMethod / getEffectiveCreatorPayoutMethod
 *   PATCH /creator/payout-method           — saveCreatorPayoutMethod → MerchantPayoutMethod
 *
 * DEV-ONLY frontend state, same localStorage-per-account pattern as lib/auth/mock/user-store.ts,
 * lib/onboarding/store.ts, and lib/merchant/store.ts — a SEPARATE key/store from the merchant
 * one, because a creator's payout requests are keyed to their own account, not to any one
 * merchant's record (their earnings span every merchant they've worked with — see
 * lib/merchant/store.ts's getCreatorEarningsSummary, which already scans across all of them).
 * Reuses `PayoutRequest`/`MerchantPayoutMethod` from lib/merchant/types.ts as-is — same shape,
 * no reason to redeclare it under a new name.
 */
const KEY = "sellvia_creator";

interface CreatorRecord {
  payoutRequests: PayoutRequest[];
  /** Override only, if the creator ever explicitly changed it from Settings → Payout — falls
   *  back to onboarding's own PayoutData otherwise, same "override, else onboarding default"
   *  pattern as the merchant side. */
  payoutMethod?: MerchantPayoutMethod;
}

function readAll(): Record<string, CreatorRecord> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, CreatorRecord>) : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, CreatorRecord>) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(all));
}

function emailKey(email: string) {
  return email.toLowerCase();
}

/**
 * BUG FIX: was `readAll()[emailKey(email)] ?? { payoutRequests: [] }` — only supplied the
 * default when the whole record was missing, not when it existed but was missing/malformed
 * fields (e.g. a record whose shape predates a field, or was written by an older code path).
 * `record.payoutRequests.reduce/map(...)` (below, and getAllPayoutRequestsAcrossCreators) would
 * then throw "not iterable" on real accumulated data — this is the actual root cause of the
 * /admin/dashboard "This page hit a snag" crash. Normalizing here, once, makes every read in
 * this file safe regardless of what's actually stored.
 */
function getRecord(email: string): CreatorRecord {
  const raw = readAll()[emailKey(email)];
  return { payoutRequests: raw?.payoutRequests ?? [], payoutMethod: raw?.payoutMethod };
}

function saveRecord(email: string, record: CreatorRecord) {
  const all = readAll();
  all[emailKey(email)] = record;
  writeAll(all);
}

function newId(prefix: string): string {
  const rand = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return `${prefix}_${rand}`;
}

export function getCreatorPayoutRequests(email: string): PayoutRequest[] {
  return getRecord(email).payoutRequests;
}

export function getCreatorPayoutMethod(email: string): MerchantPayoutMethod | undefined {
  return getRecord(email).payoutMethod;
}

/** Override, else whatever Playbook 02 onboarding captured — same reinterpret-not-adapt shape
 *  reasoning as lib/merchant/store.ts's getEffectivePayoutMethod. */
export function getEffectiveCreatorPayoutMethod(email: string): MerchantPayoutMethod | undefined {
  const override = getCreatorPayoutMethod(email);
  if (override) return override;
  const onboardingPayout = getOnboardingRecord(email)?.payout;
  return onboardingPayout as MerchantPayoutMethod | undefined;
}

export function saveCreatorPayoutMethod(email: string, method: MerchantPayoutMethod): void {
  const record = getRecord(email);
  record.payoutMethod = method;
  saveRecord(email, record);
}

/** Balance not yet requested — billed-and-charged earnings (Playbook 05 E7) minus whatever's
 *  already been requested against them. */
export async function getCreatorPendingPayoutAmount(email: string): Promise<number> {
  const creatorId = deriveCreatorId(email);
  const { billedAndCharged } = await getCreatorEarningsSummary(creatorId);
  const record = getRecord(email);
  const alreadyRequested = record.payoutRequests.reduce((sum, r) => sum + r.amount, 0);
  return Math.max(0, Math.round((billedAndCharged - alreadyRequested) * 100) / 100);
}

/** Below the PAYOUT_THRESHOLD_PKR minimum, this returns undefined rather than a zero-amount
 *  request — callers show the threshold-progress state instead (Playbook 05 E7), not a
 *  request-for-nothing. */
export async function requestCreatorPayout(email: string): Promise<PayoutRequest | undefined> {
  const amount = await getCreatorPendingPayoutAmount(email);
  if (amount <= 0) return undefined;
  const record = getRecord(email);
  const method = getEffectiveCreatorPayoutMethod(email)?.method ?? "bank";
  const request: PayoutRequest = {
    id: newId("payout"),
    amount,
    method,
    status: "processing",
    requestedAt: new Date().toISOString(),
  };
  record.payoutRequests = [...record.payoutRequests, request];
  saveRecord(email, record);
  return request;
}

/**
 * Dev-only — nothing in this app ever automatically transitions a PayoutRequest from
 * "processing" to "paid" (a real payout provider would, asynchronously, over days). Same
 * "simulate the un-backed real event" convention as Playbook 05's click/cart-add simulators, so
 * Playbook 06 F1's "payout completed" notification type has a real, reachable trigger instead of
 * being permanently dead code.
 */
export function markPayoutRequestPaid(email: string, requestId: string): PayoutRequest | undefined {
  const record = getRecord(email);
  let updated: PayoutRequest | undefined;
  record.payoutRequests = record.payoutRequests.map((r) => {
    if (r.id !== requestId || r.status !== "processing") return r;
    updated = { ...r, status: "paid", paidAt: new Date().toISOString() };
    return updated;
  });
  saveRecord(email, record);
  if (updated) notifyPayoutCompleted(email, updated.amount);
  return updated;
}

// ---------------------------------------------------------------------------
// Admin-facing cross-account export (fixes a real Playbook 07 bug — G1's time-to-payout trend
// and G4's ticket-context pendingPayoutAmount were wired to lib/merchant/store.ts's own
// payoutRequests array, which nothing in this app ever writes to; real creator payout requests
// live HERE, keyed per creator account, per this file's own header comment. Same "one owning
// file per domain" export pattern as lib/merchant/store.ts's own admin-facing exports section.)
// ---------------------------------------------------------------------------

export interface OwnedCreatorPayoutRequest { creatorEmail: string; request: PayoutRequest }

export function getAllPayoutRequestsAcrossCreators(): OwnedCreatorPayoutRequest[] {
  const all = readAll();
  const out: OwnedCreatorPayoutRequest[] = [];
  for (const [creatorEmail, record] of Object.entries(all)) {
    // `?? []` — this reads raw stored records directly, bypassing getRecord()'s own
    // normalization (see getRecord's doc comment for why that matters).
    for (const request of record.payoutRequests ?? []) out.push({ creatorEmail, request });
  }
  return out;
}
