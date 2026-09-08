import { apiRequest } from "@/lib/api";
import type {
  RealApplication,
  RealAffiliateLink,
  RealPayout,
  RealPayoutMethodState,
  UpdateRealPayoutMethodInput,
  RealCreatorDashboard,
} from "@/lib/merchant/types";

/**
 * REAL backend layer for Creator-side actions (API-ENDPOINTS.md) — the counterpart to
 * lib/creator/store.ts's mock/localStorage implementation. `RealApplication` is imported from
 * the merchant domain rather than redeclared: it's the same resource (Application), the type
 * just happens to live alongside RealOffer since that's where it was first modeled — not a
 * layering violation, the mock's own lib/merchant/store.ts already reads/writes creator-side
 * data (applyToOfferAsCreator) for the identical reason.
 */
export async function applyToOffer(offerId: string, audienceSnippet?: string): Promise<RealApplication> {
  return apiRequest<RealApplication>("/applications", { method: "POST", body: { offerId, audienceSnippet } });
}

/**
 * Confirmed 2026-09-06 — same path as the merchant-side call, role-differentiated server-side
 * (get_current_merchant_or_creator_profile): a creator calling this gets their own submitted
 * applications instead of a merchant's offer applications, same ApplicationRead shape either
 * way. Shipped exactly as asked (backend-ask-creator-applications.md) — no frontend change
 * needed, this was already calling the right path.
 */
export async function listMyApplications(): Promise<RealApplication[]> {
  return apiRequest<RealApplication[]>("/applications/mine");
}

/** Own links only, no create endpoint — links only ever exist as a side effect of an application
 *  being approved. */
export async function listAffiliateLinks(): Promise<RealAffiliateLink[]> {
  return apiRequest<RealAffiliateLink[]>("/affiliate-links");
}

/** `/go/{slug}` is served by the backend directly, not under `/api/v1` — same derivation as the
 *  Shopify webhook URL shown during store-connect (store-connect-view.tsx), strips a versioned
 *  `/api/vN` prefix rather than hardcoding a guessed production domain. */
export function affiliateLinkUrl(slug: string): string {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/api\/v\d+\/?$/i, "").replace(/\/+$/, "");
  return `${base}/go/${slug}`;
}

// ---------------------------------------------------------------------------
// Payouts
// ---------------------------------------------------------------------------

/** Computed live server-side, not a cached number. */
export async function getWalletBalance(): Promise<{ balanceCents: number; currency: string }> {
  return apiRequest<{ balanceCents: number; currency: string }>("/payouts/wallet");
}

export async function listPayouts(): Promise<RealPayout[]> {
  return apiRequest<RealPayout[]>("/payouts");
}

/**
 * No body — pays out the full available balance, no partial cashout, no threshold (2026-08-28
 * founder decision). Real errors: 409 NOTHING_TO_PAY_OUT (zero balance), 409
 * ALREADY_PAID_THIS_MONTH (monthly cadence already used).
 */
export async function requestPayout(): Promise<RealPayout> {
  return apiRequest<RealPayout>("/payouts/request", { method: "POST" });
}

export async function getPayoutMethod(): Promise<RealPayoutMethodState> {
  return apiRequest<RealPayoutMethodState>("/users/creator-profile/payout-method");
}

/**
 * Raw account/IBAN/wallet identifier is sent but never stored anywhere in SellVia's own
 * database — forwarded to a (fake, for now) Swich adapter and discarded; only `payoutMethod` +
 * an opaque provider result persist. `raast` intentionally unsupported (unconfirmed in the
 * source docs).
 */
export async function updatePayoutMethod(input: UpdateRealPayoutMethodInput): Promise<RealPayoutMethodState> {
  return apiRequest<RealPayoutMethodState>("/users/creator-profile/payout-method", { method: "PATCH", body: input });
}

/** Own data only — no time series, no activity feed. See RealCreatorDashboard's own doc comment,
 *  types.ts. */
export async function getCreatorDashboard(): Promise<RealCreatorDashboard> {
  return apiRequest<RealCreatorDashboard>("/analytics/creator-dashboard");
}
