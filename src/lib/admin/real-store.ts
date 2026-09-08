import { apiRequest } from "@/lib/api";
import type { RealOffer, RealApplication, RealRefundRequest } from "@/lib/merchant/types";
import type {
  RealUser,
  RealModerationFlag,
  RealWaitlistEntry,
  RealMarketplaceKPIs,
  RealFunnel,
  RealMonthlyPnLReport,
} from "./types";

/**
 * REAL backend layer for Admin (API-ENDPOINTS.md, `/admin/*` — a separate top-level namespace,
 * not nested under `/api/v1`) — the counterpart to lib/admin/store.ts's mock implementation.
 * `apiRequest` itself already knows to hit whatever base URL is configured; `/admin/*` paths
 * pass straight through the same client, they just don't share the `/api/v1` prefix other calls
 * do (a plain string difference, not a second client).
 */

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function listUsers(): Promise<RealUser[]> {
  return apiRequest<RealUser[]>("/admin/users");
}

export async function getUser(userId: string): Promise<RealUser> {
  return apiRequest<RealUser>(`/admin/users/${userId}`);
}

export async function suspendUser(userId: string): Promise<RealUser> {
  return apiRequest<RealUser>(`/admin/users/${userId}/suspend`, { method: "POST" });
}

export async function unsuspendUser(userId: string): Promise<RealUser> {
  return apiRequest<RealUser>(`/admin/users/${userId}/unsuspend`, { method: "POST" });
}

// ---------------------------------------------------------------------------
// Offers — on behalf of a merchant, commission override, vetting queue
// ---------------------------------------------------------------------------

export interface AdminCreateOfferInput {
  merchantProfileId: string;
  name: string;
  priceCents: number;
  currency: string;
  category: "physical" | "digital";
  commissionRate: number;
  productUrl: string;
  imageUrl?: string;
}

export async function createOfferForMerchant(input: AdminCreateOfferInput): Promise<RealOffer> {
  return apiRequest<RealOffer>("/admin/offers", { method: "POST", body: input });
}

export async function overrideCommissionRate(offerId: string, commissionRate: number): Promise<RealOffer> {
  return apiRequest<RealOffer>(`/admin/offers/${offerId}/commission-rate`, { method: "PATCH", body: { commissionRate } });
}

/** Offers currently waiting on the high-commission approval decision — the real counterpart to
 *  the gate wired into the merchant-facing PATCH /offers/{id}/status (see real-store.ts's
 *  setOfferStatus doc comment). Oldest first. */
export async function listPendingVetting(): Promise<RealOffer[]> {
  return apiRequest<RealOffer[]>("/admin/offers/pending-vetting");
}

export async function approveVetting(offerId: string): Promise<RealOffer> {
  return apiRequest<RealOffer>(`/admin/offers/${offerId}/vetting/approve`, { method: "POST" });
}

/** `note` is required — moves pending_vetting → draft, not a terminal rejection; the merchant's
 *  only path forward is deleting this offer and submitting a fresh one (no edit endpoint). */
export async function rejectVetting(offerId: string, note: string): Promise<RealOffer> {
  return apiRequest<RealOffer>(`/admin/offers/${offerId}/vetting/reject`, { method: "POST", body: { note } });
}

// ---------------------------------------------------------------------------
// Applications — moderation override
// ---------------------------------------------------------------------------

export async function overrideApproveApplication(applicationId: string): Promise<RealApplication> {
  return apiRequest<RealApplication>(`/admin/applications/${applicationId}/approve`, { method: "POST" });
}

export async function overrideRejectApplication(applicationId: string): Promise<RealApplication> {
  return apiRequest<RealApplication>(`/admin/applications/${applicationId}/reject`, { method: "POST" });
}

// ---------------------------------------------------------------------------
// Billing — direct refund-credit override, refund-request queue
// ---------------------------------------------------------------------------

export interface RealBillingCredit {
  id: string;
  saleId: string;
  amountCents: number;
  currency: string;
  appliedBillingCycleId: string;
}

/** Admin's direct override — unaffected by the merchant-side request workflow (Admin doesn't
 *  request approval from itself). Capped at 5/calendar-month, same as the request-approval path. */
export async function adminRefundCredit(saleId: string, refundAmountCents: number): Promise<RealBillingCredit> {
  return apiRequest<RealBillingCredit>(`/admin/billing/sales/${saleId}/refund-credit`, {
    method: "POST",
    body: { refundAmountCents },
  });
}

/** Pending only, oldest first — where a merchant's POST /billing/sales/{id}/refund-request lands. */
export async function listPendingRefundRequests(): Promise<RealRefundRequest[]> {
  return apiRequest<RealRefundRequest[]>("/admin/billing/refund-requests");
}

/** Re-runs the exact same credit logic the direct override uses — same monthly-cap check, so
 *  this can still fail with REFUND_CREDIT_LIMIT_REACHED if the merchant hit the cap some other
 *  way while this sat pending. */
export async function approveRefundRequest(requestId: string): Promise<RealRefundRequest> {
  return apiRequest<RealRefundRequest>(`/admin/billing/refund-requests/${requestId}/approve`, { method: "POST" });
}

/** `note` required. */
export async function denyRefundRequest(requestId: string, note: string): Promise<RealRefundRequest> {
  return apiRequest<RealRefundRequest>(`/admin/billing/refund-requests/${requestId}/deny`, { method: "POST", body: { note } });
}

// ---------------------------------------------------------------------------
// Moderation flags
// ---------------------------------------------------------------------------

/** Open only, oldest first — no way to list cleared/actioned history, unlike the mock's
 *  three-tab (unreviewed/cleared/actioned) view. Reporting itself (POST /moderation/flags,
 *  any authenticated user) has no frontend UI anywhere yet — a separate gap, not this queue's. */
export async function listOpenFlags(): Promise<RealModerationFlag[]> {
  return apiRequest<RealModerationFlag[]>("/admin/moderation/flags");
}

export async function clearFlag(flagId: string, note?: string): Promise<RealModerationFlag> {
  return apiRequest<RealModerationFlag>(`/admin/moderation/flags/${flagId}/clear`, { method: "POST", body: note ? { note } : {} });
}

/** `note` required; `suspendUserId` optional — a flag doesn't imply which side by itself. */
export async function actOnFlag(flagId: string, note: string, suspendUserId?: string): Promise<RealModerationFlag> {
  return apiRequest<RealModerationFlag>(`/admin/moderation/flags/${flagId}/act`, {
    method: "POST",
    body: { note, suspendUserId },
  });
}

// ---------------------------------------------------------------------------
// Waitlist — no mock UI ever existed for this; net-new, not a swap
// ---------------------------------------------------------------------------

export async function listWaitlist(): Promise<RealWaitlistEntry[]> {
  return apiRequest<RealWaitlistEntry[]>("/admin/waitlist");
}

export async function inviteWaitlistEntry(entryId: string): Promise<RealWaitlistEntry> {
  return apiRequest<RealWaitlistEntry>(`/admin/waitlist/${entryId}/invite`, { method: "POST" });
}

// ---------------------------------------------------------------------------
// Analytics — platform-wide KPIs, funnel, P&L
// ---------------------------------------------------------------------------

/** `?since=YYYY-MM-DD`, optional, default trailing 30 days. */
export async function getMarketplaceKpis(since?: string): Promise<RealMarketplaceKPIs> {
  const query = since ? `?since=${encodeURIComponent(since)}` : "";
  return apiRequest<RealMarketplaceKPIs>(`/admin/analytics/kpis${query}`);
}

/** One call, both sides — unlike the mock's separate getMerchantFunnel/getCreatorFunnel. No
 *  month-over-month history either (the mock's own "time to payout, last 6 months" table has no
 *  real equivalent — timeToPayoutAvgHours above is a single trailing-window aggregate). */
export async function getFunnel(): Promise<RealFunnel> {
  return apiRequest<RealFunnel>("/admin/analytics/funnel");
}

export async function generatePnlReport(periodStart: string, periodEnd: string): Promise<RealMonthlyPnLReport> {
  return apiRequest<RealMonthlyPnLReport>("/admin/analytics/pnl/generate", { method: "POST", body: { periodStart, periodEnd } });
}

export async function listPnlReports(): Promise<RealMonthlyPnLReport[]> {
  return apiRequest<RealMonthlyPnLReport[]>("/admin/analytics/pnl");
}

export interface UpdatePnlCostsInput {
  swichFeesCents?: number;
  hostingCents?: number;
  otherSaasCents?: number;
}

export async function updatePnlCosts(reportId: string, input: UpdatePnlCostsInput): Promise<RealMonthlyPnLReport> {
  return apiRequest<RealMonthlyPnLReport>(`/admin/analytics/pnl/${reportId}`, { method: "PATCH", body: input });
}

export async function finalizePnlReport(reportId: string): Promise<RealMonthlyPnLReport> {
  return apiRequest<RealMonthlyPnLReport>(`/admin/analytics/pnl/${reportId}/finalize`, { method: "POST" });
}
