import { apiRequest } from "@/lib/api";
import type { RealOffer, RealApplication, RealSale, RealBillingCycle, RealRefundRequest, RealMerchantDashboard } from "./types";

/**
 * REAL backend layer for the Merchant Offer domain (API-ENDPOINTS.md, 2026-09-05) — the
 * counterpart to lib/merchant/store.ts's mock implementation, kept in a separate file rather
 * than branched inline: the two model genuinely different shapes/flows (see RealOffer's own doc
 * comment in types.ts), not just different data sources for the same shape.
 *
 * Every function here is `merchantProfileId`-implicit — identity comes from the session's own
 * Bearer token (apiRequest's client-side auth-token provider), never passed explicitly, matching
 * the real contract's own "own-account-only" design.
 */

export interface PrefillResult {
  name: string;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
}

/** Best-effort — the caller decides what "couldn't fetch" means for the UI (never blocks
 *  creation); a 422 PRODUCT_FETCH_FAILED surfaces via the thrown ApiError as normal. */
export async function prefillOffer(productUrl: string): Promise<PrefillResult> {
  return apiRequest<PrefillResult>("/offers/prefill", { method: "POST", body: { productUrl } });
}

export interface CreateRealOfferInput {
  name: string;
  priceCents: number;
  currency: string;
  category: "physical" | "digital";
  commissionRate: number;
  productUrl: string;
  /** Optional — prefill is best-effort, so an offer can legitimately have none. */
  imageUrl?: string;
}

/** Always creates as `draft` — there is no "publish on create" option server-side. Callers that
 *  want the old one-motion "create and go live" feel (real-new-offer-view.tsx) call
 *  `publishOffer` immediately after, as two real requests presented as one guided flow. */
export async function createOffer(input: CreateRealOfferInput): Promise<RealOffer> {
  return apiRequest<RealOffer>("/offers", { method: "POST", body: input });
}

/** Every status included (draft/pending_vetting/live/paused/ended) — the public `GET /offers`
 *  listing is the live marketplace, never a merchant's own management view. */
export async function listMyOffers(): Promise<RealOffer[]> {
  return apiRequest<RealOffer[]>("/offers/mine");
}

/** The public marketplace listing (live offers only) — creator Discover reads this, not
 *  `/offers/mine`. Public scope: no auth strictly required, but sending the session token along
 *  anyway costs nothing and matches every other call here. Rate-limited by client IP
 *  server-side, not something this client needs to pre-empt. */
export async function listPublicOffers(): Promise<RealOffer[]> {
  return apiRequest<RealOffer[]>("/offers");
}

export async function getOffer(offerId: string): Promise<RealOffer> {
  return apiRequest<RealOffer>(`/offers/${offerId}`);
}

/**
 * `live`, `paused`, or `ended` are the only real targets a merchant can request — the response's
 * OWN `status` may still come back `pending_vetting` instead of `live` (the high-commission gate,
 * ≥40% on a first-ever publish) — 200, not an error; callers must read the response, not assume
 * the request landed as asked. `pending_vetting` can never be requested directly, and once an
 * offer IS `pending_vetting`, no merchant-initiated PATCH can move it anywhere (409
 * INVALID_TRANSITION) — only Admin's vetting approve/reject can.
 */
export async function setOfferStatus(offerId: string, status: "live" | "paused" | "ended"): Promise<RealOffer> {
  return apiRequest<RealOffer>(`/offers/${offerId}/status`, { method: "PATCH", body: { status } });
}

/** Soft-delete — blocked (409 OFFER_HAS_ACTIVE_DEALS) while any AffiliateLink exists on the
 *  offer; use `setOfferStatus(id, "ended")` to wind one down with an active creator instead. */
export async function deleteOffer(offerId: string): Promise<RealOffer> {
  return apiRequest<RealOffer>(`/offers/${offerId}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

/** Every application across the merchant's own offers, any status — includes the creatorX
 *  summary fields (RealApplication's own doc comment, types.ts) added specifically so this list
 *  is actually reviewable, not just a table of ids. */
export async function listMyApplications(): Promise<RealApplication[]> {
  return apiRequest<RealApplication[]>("/applications/mine");
}

export async function approveApplication(applicationId: string): Promise<RealApplication> {
  return apiRequest<RealApplication>(`/applications/${applicationId}/approve`, { method: "POST" });
}

/** No request body — the real contract has no reject-reason field at all, unlike the mock's
 *  free-text one. */
export async function rejectApplication(applicationId: string): Promise<RealApplication> {
  return apiRequest<RealApplication>(`/applications/${applicationId}/reject`, { method: "POST" });
}

// ---------------------------------------------------------------------------
// Sales & billing
// ---------------------------------------------------------------------------

/** Every status included. No offer/creator resolution possible from this alone — see RealSale's
 *  own doc comment, types.ts, for the gap and the ask sent about it. */
export async function listSales(): Promise<RealSale[]> {
  return apiRequest<RealSale[]>("/sales");
}

/** The current calendar month's open cycle — 404s (as a real "nothing yet" state, not an error)
 *  if no accepted Sale exists yet this month. */
export async function getCurrentBillingCycle(): Promise<RealBillingCycle> {
  return apiRequest<RealBillingCycle>("/billing/current-cycle");
}

/** Every cycle, any status, newest period first. */
export async function listBillingCycles(): Promise<RealBillingCycle[]> {
  return apiRequest<RealBillingCycle[]>("/billing/cycles");
}

/**
 * Replaces the old instant `refund-credit` — this creates a `pending` request; nothing is
 * credited until Admin approves it. `requestedAmountCents` must be positive and no more than the
 * sale's own `amountCents` (the only cap this client can enforce client-side; the real 5/month
 * limit is only checked at approval time, server-side — see REFUND_CREDIT_LIMIT_REACHED).
 */
export async function requestRefund(saleId: string, requestedAmountCents: number): Promise<RealRefundRequest> {
  return apiRequest<RealRefundRequest>(`/billing/sales/${saleId}/refund-request`, {
    method: "POST",
    body: { requestedAmountCents },
  });
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

/** Own offer performance only — never platform-wide (that's Admin's /admin/analytics/kpis). No
 *  time series, per-offer stats, or activity feed — see RealMerchantDashboard's own doc comment,
 *  types.ts, for why this is genuinely all there is today, not a partial read. */
export async function getMerchantDashboard(): Promise<RealMerchantDashboard> {
  return apiRequest<RealMerchantDashboard>("/analytics/merchant-dashboard");
}
