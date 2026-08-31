import type {
  ModerationFlag,
  FlagRule,
  FlagStatus,
  VettingItem,
  VettingStatus,
  UserSuspension,
  TicketContext,
  Chargeback,
  ChargebackStatus,
  ReconciliationMismatch,
  AdminAuditEntry,
  AuditActionSource,
  MonthlyPnl,
  ManualCostEntry,
  AiUsageEvent,
} from "./types";
import {
  getAllOffersAcrossMerchants,
  getAllApplicationsAcrossMerchants,
  getAllSalesAcrossMerchants,
  getAllEventsAcrossMerchants,
  getAllMerchantEmails,
  getOfferStats,
  endAllOffersForMerchant,
  resolveRefundCredit as merchantResolveRefundCredit,
} from "@/lib/merchant/store";
import { getAllPayoutRequestsAcrossCreators } from "@/lib/creator/store";
import { getAllUsers } from "@/lib/auth/mock/user-store";
import { PLATFORM_FEE_RATE } from "@/lib/merchant/constants";
import {
  CHURN_AT_RISK_HOURS,
  CHARGEBACK_FREE_LIFETIME_COUNT,
  FLAGGED_VELOCITY_CLICKS_PER_HOUR,
  FLAGGED_CONVERSION_OUTLIER_MULTIPLIER,
  FLAGGED_HIGH_COMMISSION_THRESHOLD,
} from "./constants";

/**
 * MOCK DATA LAYER — Admin Panel (Playbook 07, G1–G10 except G9's console, which has its own
 * lib/admin/console/* files).
 *
 * Stands in for the `/admin/*` endpoints named throughout Operations/Admin Panel + SCREEN_
 * INVENTORY §G — grouped by G-item below (request/response shapes are the types this file
 * imports from ./types.ts; each function's return type IS the response shape):
 *
 *   G1  GET /admin/dashboard              — getMarketplaceHealth, getFunnel, getTimeToPayoutTrend
 *   G2  GET  /admin/flags                 — getFlags
 *       POST /admin/flags/scan            — runFraudScan (⚠ real detection is a backend job against
 *                                            real click/IP/device data — this scans the same mock
 *                                            data every other screen already has, with the
 *                                            explicitly-flagged placeholder thresholds in
 *                                            ./constants.ts, not a real fraud model)
 *       POST /admin/flags/:id/clear       — clearFlag
 *       POST /admin/flags/:id/action      — actionFlag
 *   G3  GET  /admin/offers/vetting        — syncVettingQueue, getVettingQueue
 *       POST /admin/offers/:id/vet        — decideVetting
 *   G4  GET  /admin/users                 — getUserSummaries
 *       GET  /admin/users/:email/context  — getTicketContext
 *       POST /admin/users/:email/suspend  — suspendUser
 *       POST /admin/users/:email/unsuspend — unsuspendUser
 *   G5  GET  /admin/refund-requests       — getPendingRefundRequests
 *       POST /admin/refund-requests/:id/decide — decideRefundRequest
 *       GET  /admin/chargebacks           — getChargebacks
 *       POST /admin/chargebacks           — reportChargeback (⚠ real trigger is a Switch webhook)
 *       POST /admin/chargebacks/:id/evidence — submitChargebackEvidence
 *       POST /admin/chargebacks/:id/resolve  — resolveChargeback
 *   G6  GET  /admin/reconciliation        — getReconciliationMismatches
 *       POST /admin/reconciliation/scan   — runReconciliationScan (⚠ same real-vs-mock gap as G2 —
 *                                            no real Switch records exist to diff against; see
 *                                            Payments/Reconciliation's own 2026-08-07 update on what
 *                                            this can/can't independently verify post-checkout-reversal)
 *       POST /admin/reconciliation/:id/resolve — resolveMismatch
 *   G8  GET  /admin/at-risk-users         — getAtRiskUsers (⚠ real version is an hourly scheduled
 *                                            job's output — this computes the same query on read,
 *                                            not on a cron; see doc comment on the function itself)
 *   G10 GET  /admin/pnl/:month            — computeMonthlyPnl
 *       POST /admin/pnl/:month/finalize   — finalizeMonthlyPnl
 *       POST /admin/costs/manual          — addManualCostEntry
 *       GET  /admin/ai-usage              — getAiUsageEvents
 *
 *   Shared audit log (every G-item's write actions, plus G9's console — one log, tagged by
 *   origin, per Operations/Founder AI Command Console):
 *       GET  /admin/audit-log             — getAuditLog
 *       (writeAudit is internal — every function above that mutates state calls it itself, so no
 *       call site can forget to log an action)
 *
 * Known mock-only deviation: functions acting on ONE OTHER account's data (suspendUser,
 * getTicketContext, decideVetting, etc.) correctly take an explicit email/id param — that's the
 * real shape for admin-on-behalf-of-someone-else endpoints, not a mock convenience. Functions
 * with no target param at all (getFlags, getChargebacks, …) are correctly shaped too — the admin's
 * own identity for THOSE would come from the session, same as every other domain's "my own data"
 * endpoints; this file never passes an admin-identity param since nothing here needs to.
 */

const KEY = "sellvia_admin";

interface AdminRecord {
  flags: ModerationFlag[];
  vetting: VettingItem[];
  suspensions: UserSuspension[];
  chargebacks: Chargeback[];
  mismatches: ReconciliationMismatch[];
  auditLog: AdminAuditEntry[];
  pnlReports: MonthlyPnl[];
  manualCosts: ManualCostEntry[];
  aiUsageEvents: AiUsageEvent[];
}

function emptyRecord(): AdminRecord {
  return {
    flags: [],
    vetting: [],
    suspensions: [],
    chargebacks: [],
    mismatches: [],
    auditLog: [],
    pnlReports: [],
    manualCosts: [],
    aiUsageEvents: [],
  };
}

function readRecord(): AdminRecord {
  if (typeof localStorage === "undefined") return emptyRecord();
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...emptyRecord(), ...(JSON.parse(raw) as Partial<AdminRecord>) } : emptyRecord();
  } catch {
    return emptyRecord();
  }
}

function writeRecord(record: AdminRecord) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(record));
}

function newId(prefix: string): string {
  const rand = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return `${prefix}_${rand}`;
}

/** Every mutating function in this file calls this — one shared log, tagged by origin, per
 *  Operations/Founder AI Command Console's explicit requirement (not a separate log for the
 *  console's own actions). `actorEmail` is the admin performing the action — a real param here,
 *  since this genuinely is "who did this," not a my-own-data lookup. */
/**
 * Exported (not just used internally) so lib/admin/console/engine.ts — the ONE place outside
 * this file allowed to call it — can log every console READ too (per Operations/Founder AI
 * Command Console: "every console-initiated action is logged," reads included; every write path
 * below already logs itself when called from the dashboard). Everything else in this app still
 * goes through the typed store functions only, per the "no scattered direct access" rule.
 */
export function logAdminAction(
  entry: Omit<AdminAuditEntry, "id" | "at" | "actorEmail" | "initiatedVia">,
  actorEmail: string,
  initiatedVia: AuditActionSource = "dashboard",
) {
  writeAudit(entry, actorEmail, initiatedVia);
}

function writeAudit(
  entry: Omit<AdminAuditEntry, "id" | "at" | "actorEmail" | "initiatedVia">,
  actorEmail: string,
  initiatedVia: AuditActionSource = "dashboard",
) {
  const record = readRecord();
  record.auditLog = [
    { ...entry, id: newId("audit"), at: new Date().toISOString(), actorEmail, initiatedVia },
    ...record.auditLog,
  ];
  writeRecord(record);
}

export function getAuditLog(): AdminAuditEntry[] {
  return readRecord().auditLog;
}

// ---------------------------------------------------------------------------
// G1 — Admin Dashboard
// ---------------------------------------------------------------------------

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface MarketplaceHealth {
  activeMerchants: number;
  activeCreators: number;
  /** null when there are zero active merchants — a ratio against zero isn't a real number
   *  (Playbook 04/05's own "null means not enough data" convention). */
  liquidityRatio: number | null;
}

/** Success Metrics's real definitions: active merchant = ≥1 live offer published in the last 30
 *  days (using Offer.createdAt as the only "when" this mock tracks); active creator = ≥1
 *  approved application in the last 30 days. */
export async function getMarketplaceHealth(): Promise<MarketplaceHealth> {
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  const offers = await getAllOffersAcrossMerchants();
  const applications = await getAllApplicationsAcrossMerchants();

  const activeMerchantEmails = new Set(
    offers.filter((o) => o.status === "live" && new Date(o.createdAt).getTime() >= cutoff).map((o) => o.merchantEmail),
  );
  const activeCreatorIds = new Set(
    applications
      .filter((o) => o.application.status === "approved" && o.application.decidedAt && new Date(o.application.decidedAt).getTime() >= cutoff)
      .map((o) => o.application.creatorId),
  );

  return {
    activeMerchants: activeMerchantEmails.size,
    activeCreators: activeCreatorIds.size,
    liquidityRatio: activeMerchantEmails.size > 0 ? Math.round((activeCreatorIds.size / activeMerchantEmails.size) * 100) / 100 : null,
  };
}

export interface FunnelStep {
  label: string;
  count: number;
}

/** Merchant funnel: offers listed → offers with ≥1 application → offers with ≥1 sale. Real
 *  counts, computed live — not the full waitlist→activated step (no waitlist-to-signup link
 *  exists in this mock, see Playbook 07 §6.7). */
export async function getMerchantFunnel(): Promise<FunnelStep[]> {
  const offers = await getAllOffersAcrossMerchants();
  const applications = await getAllApplicationsAcrossMerchants();
  const sales = await getAllSalesAcrossMerchants();
  const offerIdsWithApplication = new Set(applications.map((o) => o.offer.id));
  const offerIdsWithSale = new Set(sales.map((o) => o.offer.id));
  return [
    { label: "Offers listed", count: offers.length },
    { label: "Received ≥1 application", count: offers.filter((o) => offerIdsWithApplication.has(o.id)).length },
    { label: "Recorded ≥1 sale", count: offers.filter((o) => offerIdsWithSale.has(o.id)).length },
  ];
}

/** Creator funnel: applications submitted → approved → converted (≥1 sale on that link). */
export async function getCreatorFunnel(): Promise<FunnelStep[]> {
  const applications = await getAllApplicationsAcrossMerchants();
  const sales = await getAllSalesAcrossMerchants();
  const applicationIdsWithSale = new Set(sales.map((o) => o.sale.applicationId));
  return [
    { label: "Applications submitted", count: applications.length },
    { label: "Approved", count: applications.filter((o) => o.application.status === "approved").length },
    { label: "Converted (≥1 sale)", count: applications.filter((o) => applicationIdsWithSale.has(o.application.id)).length },
  ];
}

export interface TimeToPayoutPoint {
  month: string;
  avgDays: number | null;
  paidCount: number;
}

/**
 * Real computation over real timestamps (PayoutRequest.requestedAt/paidAt — added specifically
 * for this, Playbook 07 G1) — grouped by the month the payout was REQUESTED. `avgDays: null` for
 * a month with zero paid requests, not a fabricated 0.
 *
 * BUG FIX (this pass): was reading lib/merchant/store.ts's own payoutRequests array, which
 * nothing in the app ever writes to (a leftover, never-wired "merchant requests a payout FROM
 * SellVia" concept that doesn't match the real architecture — see Money Flow doc: SellVia bills
 * the merchant, then pays creators from its own collected funds; SellVia never owes the merchant
 * a payout). Real payout requests are creator-side (lib/creator/store.ts) — this now reads from
 * there via getAllPayoutRequestsAcrossCreators, matching what markPayoutRequestPaid's own doc
 * comment already said this metric was for.
 */
export function getTimeToPayoutTrend(months = 6): TimeToPayoutPoint[] {
  const requests = getAllPayoutRequestsAcrossCreators().map((o) => o.request);
  const out: TimeToPayoutPoint[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const inMonth = requests.filter((r) => r.paidAt && `${new Date(r.requestedAt).getFullYear()}-${String(new Date(r.requestedAt).getMonth() + 1).padStart(2, "0")}` === key);
    const days = inMonth.map((r) => (new Date(r.paidAt!).getTime() - new Date(r.requestedAt).getTime()) / (24 * 60 * 60 * 1000));
    out.push({
      month: key,
      avgDays: days.length > 0 ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10 : null,
      paidCount: days.length,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// G2 — Moderation queue
// ---------------------------------------------------------------------------

export function getFlags(status?: FlagStatus): ModerationFlag[] {
  const flags = readRecord().flags;
  return status ? flags.filter((f) => f.status === status) : flags;
}

export function getFlag(id: string): ModerationFlag | undefined {
  return readRecord().flags.find((f) => f.id === id);
}

function addFlag(record: AdminRecord, flag: Omit<ModerationFlag, "id" | "status" | "createdAt">) {
  const alreadyFlagged = record.flags.some((f) => f.entityId === flag.entityId && f.rule === flag.rule && f.status === "unreviewed");
  if (alreadyFlagged) return; // idempotent — re-running the scan doesn't duplicate an open flag
  record.flags = [
    { ...flag, id: newId("flag"), status: "unreviewed", createdAt: new Date().toISOString() },
    ...record.flags,
  ];
}

/**
 * Security/Fraud Prevention lists 5 rules; this scans real mock data for the 3 this app actually
 * has enough real signal to check (velocity via OfferEvent timestamps, conversion outliers via
 * getOfferStats, merchant under-reporting via click-vs-sale volume). "self_referral" and
 * "device_fingerprint" are NOT run here — this mock has no IP/payment-method/device data
 * anywhere to check them against; running a fake version of those would be worse than admitting
 * the gap. Thresholds used are the explicitly-flagged placeholders in ./constants.ts, not real
 * product decisions.
 */
export async function runFraudScan(actorEmail: string): Promise<{ flagsCreated: number }> {
  const record = readRecord();
  const before = record.flags.length;
  const offers = await getAllOffersAcrossMerchants();
  const events = await getAllEventsAcrossMerchants();
  const now = Date.now();

  // Velocity: >N click events on one offer within the last hour.
  for (const offer of offers) {
    const recentClicks = events.filter(
      (e) => e.event.offerId === offer.id && e.event.stage === "click" && now - new Date(e.event.at).getTime() < 60 * 60 * 1000,
    ).length;
    if (recentClicks >= FLAGGED_VELOCITY_CLICKS_PER_HOUR) {
      addFlag(record, {
        rule: "velocity" as FlagRule,
        entityType: "offer",
        entityId: offer.id,
        entityLabel: `"${offer.productName}" — ${recentClicks} clicks in the last hour (placeholder threshold: ${FLAGGED_VELOCITY_CLICKS_PER_HOUR})`,
        ownerEmail: offer.merchantEmail,
      });
    }
  }

  // Conversion-rate outliers: an offer converting far above the platform average.
  const rates = (await Promise.all(offers.map(async (o) => ({ offer: o, stats: await getOfferStats(o.merchantEmail, o.id) })))).filter(
    (r) => r.stats.clicks > 0,
  );
  const avgRate = rates.length > 0 ? rates.reduce((sum, r) => sum + r.stats.conversionRate, 0) / rates.length : 0;
  for (const { offer, stats } of rates) {
    if (avgRate > 0 && stats.conversionRate >= avgRate * FLAGGED_CONVERSION_OUTLIER_MULTIPLIER) {
      addFlag(record, {
        rule: "conversion_outlier" as FlagRule,
        entityType: "offer",
        entityId: offer.id,
        entityLabel: `"${offer.productName}" — ${stats.conversionRate.toFixed(1)}% conversion vs. ${avgRate.toFixed(1)}% average`,
        ownerEmail: offer.merchantEmail,
      });
    }
  }

  // Merchant under-reporting: high click volume, disproportionately few reported sales.
  for (const offer of offers) {
    if (offer.clicks < FLAGGED_VELOCITY_CLICKS_PER_HOUR) continue; // not enough traffic to judge
    const stats = await getOfferStats(offer.merchantEmail, offer.id);
    if (stats.clicks > 0 && stats.conversionRate < avgRate / FLAGGED_CONVERSION_OUTLIER_MULTIPLIER) {
      addFlag(record, {
        rule: "merchant_underreporting" as FlagRule,
        entityType: "offer",
        entityId: offer.id,
        entityLabel: `"${offer.productName}" — high clicks, suspiciously low reported sales (not proof, per Fraud Prevention's own caveat)`,
        ownerEmail: offer.merchantEmail,
      });
    }
  }

  writeRecord(record);
  const created = record.flags.length - before;
  if (created > 0) writeAudit({ action: "run_fraud_scan", targetType: "system", targetId: "fraud_scan" }, actorEmail);
  return { flagsCreated: created };
}

export function clearFlag(id: string, actorEmail: string, note?: string, initiatedVia: AuditActionSource = "dashboard"): ModerationFlag | undefined {
  const record = readRecord();
  let updated: ModerationFlag | undefined;
  record.flags = record.flags.map((f) => (f.id === id ? (updated = { ...f, status: "cleared", reviewedAt: new Date().toISOString(), reviewNote: note }) : f));
  writeRecord(record);
  if (updated) writeAudit({ action: "clear_flag", targetType: "flag", targetId: id, detail: note }, actorEmail, initiatedVia);
  return updated;
}

/** "Act" on a flag — for an offer-shaped flag, this ends the offer (real effect, mirrors
 *  suspendUser's honesty: no fake "banned" state with nothing behind it). */
export async function actionFlag(id: string, actorEmail: string, note?: string): Promise<ModerationFlag | undefined> {
  const record = readRecord();
  const flag = record.flags.find((f) => f.id === id);
  if (!flag) return undefined;
  if (flag.entityType === "offer") await endAllOffersForMerchant(flag.ownerEmail);
  record.flags = record.flags.map((f) => (f.id === id ? { ...f, status: "actioned", reviewedAt: new Date().toISOString(), reviewNote: note } : f));
  writeRecord(record);
  writeAudit({ action: "action_flag", targetType: "flag", targetId: id, detail: note }, actorEmail);
  return record.flags.find((f) => f.id === id);
}

// ---------------------------------------------------------------------------
// G3 — Offer vetting queue
// ---------------------------------------------------------------------------

/** Scans live offers for the flagged high-commission threshold and upserts a pending
 *  VettingItem for any not already tracked — idempotent, same pattern as runFraudScan. Real
 *  system would create this at offer-publish time server-side; this pulls on read instead since
 *  there's no backend to push at write time. */
export async function syncVettingQueue(): Promise<void> {
  const record = readRecord();
  const offers = await getAllOffersAcrossMerchants();
  for (const offer of offers) {
    if (offer.commissionRate < FLAGGED_HIGH_COMMISSION_THRESHOLD) continue;
    const alreadyTracked = record.vetting.some((v) => v.offerId === offer.id);
    if (alreadyTracked) continue;
    record.vetting = [
      { id: newId("vet"), offerId: offer.id, merchantEmail: offer.merchantEmail, reason: "high_commission", status: "pending", createdAt: new Date().toISOString() },
      ...record.vetting,
    ];
  }
  writeRecord(record);
}

export interface VettingItemWithOffer extends VettingItem {
  /** Joined from the owning offer at read time — "(offer no longer exists)" is a real possible
   *  state (e.g. the merchant deleted it since queuing), not a bug, so it's rendered honestly
   *  rather than left undefined for the UI to guess at. */
  productName: string;
  commissionRate: number;
}

export async function getVettingQueue(status?: VettingStatus): Promise<VettingItemWithOffer[]> {
  const offers = await getAllOffersAcrossMerchants();
  return readRecord()
    .vetting.filter((v) => !status || v.status === status)
    .map((v) => {
      const offer = offers.find((o) => o.id === v.offerId);
      return { ...v, productName: offer?.productName ?? "(offer no longer exists)", commissionRate: offer?.commissionRate ?? 0 };
    });
}

export async function decideVetting(id: string, decision: "approved" | "rejected", actorEmail: string, initiatedVia: AuditActionSource = "dashboard"): Promise<VettingItem | undefined> {
  const record = readRecord();
  const item = record.vetting.find((v) => v.id === id);
  if (!item) return undefined;
  if (decision === "rejected") await endAllOffersForMerchant(item.merchantEmail); // conservative: pulls the offer down pending merchant follow-up
  record.vetting = record.vetting.map((v) => (v.id === id ? { ...v, status: decision, decidedAt: new Date().toISOString() } : v));
  writeRecord(record);
  writeAudit({ action: "decide_vetting", targetType: "offer", targetId: item.offerId, detail: decision }, actorEmail, initiatedVia);
  return record.vetting.find((v) => v.id === id);
}

// ---------------------------------------------------------------------------
// G4 — User management
// ---------------------------------------------------------------------------

export interface UserSummary {
  email: string;
  roles: string[];
  verified: boolean;
  suspended: boolean;
  createdAt?: string;
}

export function getUserSummaries(): UserSummary[] {
  const suspensions = readRecord().suspensions;
  return getAllUsers().map((u) => ({
    email: u.email,
    roles: u.roles,
    verified: u.verified,
    suspended: suspensions.some((s) => s.email.toLowerCase() === u.email.toLowerCase() && s.suspended),
    createdAt: u.createdAt,
  }));
}

export function isSuspended(email: string): boolean {
  return readRecord().suspensions.some((s) => s.email.toLowerCase() === email.toLowerCase() && s.suspended);
}

/**
 * G4's `get_ticket_context`-style aggregated view — one call, four data sources.
 *
 * BUG FIX (this pass): pendingPayoutAmount was reading merchant-side payoutRequests, an
 * always-empty leftover array nothing in the app ever writes to (see getTimeToPayoutTrend's own
 * doc comment above for the full explanation). Real payout requests are creator-side, so this now
 * reads getAllPayoutRequestsAcrossCreators filtered to this account's own email — correctly $0
 * for a merchant-only account (merchants are never owed a payout under the real architecture,
 * they're billed), real for a creator account.
 */
export async function getTicketContext(email: string): Promise<TicketContext> {
  const offers = (await getAllOffersAcrossMerchants()).filter((o) => o.merchantEmail.toLowerCase() === email.toLowerCase());
  const applications = (await getAllApplicationsAcrossMerchants()).filter((o) => o.merchantEmail.toLowerCase() === email.toLowerCase() || o.application.creatorEmail?.toLowerCase() === email.toLowerCase());
  const sales = (await getAllSalesAcrossMerchants()).filter((o) => o.merchantEmail.toLowerCase() === email.toLowerCase());
  const payouts = getAllPayoutRequestsAcrossCreators().filter((o) => o.creatorEmail.toLowerCase() === email.toLowerCase());
  const user = getAllUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
  return {
    email,
    roles: user?.roles ?? [],
    suspended: isSuspended(email),
    offerCount: offers.length,
    applicationCount: applications.length,
    saleCount: sales.length,
    pendingPayoutAmount: payouts.filter((p) => p.request.status === "processing").reduce((sum, p) => sum + p.request.amount, 0),
  };
}

export async function suspendUser(email: string, actorEmail: string, reason?: string, initiatedVia: AuditActionSource = "dashboard"): Promise<void> {
  const record = readRecord();
  const others = record.suspensions.filter((s) => s.email.toLowerCase() !== email.toLowerCase());
  record.suspensions = [...others, { email, suspended: true, suspendedAt: new Date().toISOString(), reason }];
  writeRecord(record);
  const endedOffers = await endAllOffersForMerchant(email);
  writeAudit({ action: "suspend_user", targetType: "user", targetId: email, detail: `${reason ?? "no reason given"}${endedOffers ? ` — ended ${endedOffers} live offer(s)` : ""}` }, actorEmail, initiatedVia);
}

export function unsuspendUser(email: string, actorEmail: string): void {
  const record = readRecord();
  record.suspensions = record.suspensions.map((s) => (s.email.toLowerCase() === email.toLowerCase() ? { ...s, suspended: false } : s));
  writeRecord(record);
  writeAudit({ action: "unsuspend_user", targetType: "user", targetId: email }, actorEmail);
}

// ---------------------------------------------------------------------------
// G5 — Refunds / disputes
// ---------------------------------------------------------------------------

export async function getPendingRefundRequests() {
  return (await getAllSalesAcrossMerchants()).filter((o) => o.sale.refundCreditStatus === "requested");
}

export async function decideRefundRequest(merchantEmail: string, saleId: string, decision: "approved" | "denied", actorEmail: string, initiatedVia: AuditActionSource = "dashboard") {
  const result = await merchantResolveRefundCredit(merchantEmail, saleId, decision);
  if (result) writeAudit({ action: "decide_refund_request", targetType: "sale", targetId: saleId, detail: decision }, actorEmail, initiatedVia);
  return result;
}

export function getChargebacks(status?: ChargebackStatus): Chargeback[] {
  return readRecord().chargebacks.filter((c) => !status || c.status === status);
}

/** Real trigger is a Switch webhook (Payments/Chargebacks) — this is the Admin-side manual entry
 *  point standing in for that webhook handler until one exists. */
export function reportChargeback(merchantEmail: string, saleId: string, amount: number, actorEmail: string): Chargeback {
  const record = readRecord();
  const chargeback: Chargeback = { id: newId("cb"), saleId, merchantEmail, amount, status: "open", createdAt: new Date().toISOString() };
  record.chargebacks = [chargeback, ...record.chargebacks];
  writeRecord(record);
  writeAudit({ action: "report_chargeback", targetType: "sale", targetId: saleId }, actorEmail);
  return chargeback;
}

export function submitChargebackEvidence(id: string, evidence: string, actorEmail: string): Chargeback | undefined {
  const record = readRecord();
  let updated: Chargeback | undefined;
  record.chargebacks = record.chargebacks.map((c) => (c.id === id ? (updated = { ...c, status: "evidence_submitted", evidence }) : c));
  writeRecord(record);
  if (updated) writeAudit({ action: "submit_chargeback_evidence", targetType: "chargeback", targetId: id }, actorEmail);
  return updated;
}

/** Payments/Chargebacks, 2026-08-07: first 5 LOST disputes (lifetime, per merchant) — SellVia
 *  absorbs the Switch dispute fee; 6th onward, it's deducted from the merchant. This mock has no
 *  real Switch balance to deduct from, so "deducted from merchant" is recorded as a fact
 *  (`feeAbsorbedBySellvia: false`) on the resolved record rather than actually moving money. */
export function resolveChargeback(id: string, outcome: "won" | "lost", actorEmail: string): { chargeback: Chargeback; feeAbsorbedBySellvia: boolean } | undefined {
  const record = readRecord();
  const chargeback = record.chargebacks.find((c) => c.id === id);
  if (!chargeback) return undefined;

  let feeAbsorbedBySellvia = true;
  if (outcome === "lost") {
    const priorLostCount = record.chargebacks.filter((c) => c.merchantEmail === chargeback.merchantEmail && c.status === "lost").length;
    feeAbsorbedBySellvia = priorLostCount < CHARGEBACK_FREE_LIFETIME_COUNT;
  }

  record.chargebacks = record.chargebacks.map((c) => (c.id === id ? { ...c, status: outcome, resolvedAt: new Date().toISOString() } : c));
  writeRecord(record);
  writeAudit({ action: "resolve_chargeback", targetType: "chargeback", targetId: id, detail: `${outcome}${outcome === "lost" ? ` — fee ${feeAbsorbedBySellvia ? "absorbed by SellVia" : "passed to merchant"}` : ""}` }, actorEmail);
  return { chargeback: record.chargebacks.find((c) => c.id === id)!, feeAbsorbedBySellvia };
}

// ---------------------------------------------------------------------------
// G6 — Reconciliation review
// ---------------------------------------------------------------------------

export function getReconciliationMismatches(status?: ReconciliationMismatch["status"]): ReconciliationMismatch[] {
  return readRecord().mismatches.filter((m) => !status || m.status === status);
}

/**
 * No real Switch transaction feed exists to diff against (Payments/Reconciliation's own
 * 2026-08-07 update: this app can't independently verify a reported sale even with a real
 * integration, post-checkout-reversal). This scan is illustrative only — it flags every Nth sale
 * deterministically (not random) so the review-queue UI has real, reachable, reproducible rows
 * to demo, clearly not a real discrepancy detector.
 */
export async function runReconciliationScan(actorEmail: string): Promise<{ mismatchesCreated: number }> {
  const record = readRecord();
  const before = record.mismatches.length;
  const sales = await getAllSalesAcrossMerchants();
  sales.forEach((o, i) => {
    if (i % 7 !== 0) return; // illustrative cadence, not a real detection signal
    const alreadyFlagged = record.mismatches.some((m) => m.saleId === o.sale.id && m.status === "open");
    if (alreadyFlagged) return;
    record.mismatches = [
      {
        id: newId("recon"),
        saleId: o.sale.id,
        kind: "missing_switch_charge",
        detail: `Sale ${o.sale.id} on "${o.offer.productName}" has no matching Switch charge record on file (illustrative — no real Switch feed exists to check against).`,
        status: "open",
        detectedAt: new Date().toISOString(),
      },
      ...record.mismatches,
    ];
  });
  writeRecord(record);
  const created = record.mismatches.length - before;
  if (created > 0) writeAudit({ action: "run_reconciliation_scan", targetType: "system", targetId: "reconciliation_scan" }, actorEmail);
  return { mismatchesCreated: created };
}

export function resolveMismatch(id: string, note: string, actorEmail: string): ReconciliationMismatch | undefined {
  const record = readRecord();
  let updated: ReconciliationMismatch | undefined;
  record.mismatches = record.mismatches.map((m) => (m.id === id ? (updated = { ...m, status: "resolved", resolvedAt: new Date().toISOString(), resolutionNote: note }) : m));
  writeRecord(record);
  if (updated) writeAudit({ action: "resolve_mismatch", targetType: "reconciliation_mismatch", targetId: id, detail: note }, actorEmail);
  return updated;
}

// ---------------------------------------------------------------------------
// G8 — At-risk new users
// ---------------------------------------------------------------------------

export interface AtRiskUser {
  email: string;
  role: "merchant" | "creator";
  hoursSinceSignup: number;
  createdAt: string;
}

/**
 * Analytics/Activation, Aha Moment & Churn Signals's real query, computed on read rather than by
 * an hourly cron (no scheduler exists in this frontend-only build — Playbook 07 §6.8, same
 * discipline as Playbook 06 F2's deletion sweep): users created ≥48h ago whose role-appropriate
 * core action (merchant: publish an offer; creator: submit an application) never happened.
 */
export async function getAtRiskUsers(): Promise<AtRiskUser[]> {
  const now = Date.now();
  const offerMerchantEmails = new Set((await getAllOffersAcrossMerchants()).map((o) => o.merchantEmail.toLowerCase()));
  const applicationCreatorEmails = new Set(
    (await getAllApplicationsAcrossMerchants()).map((o) => o.application.creatorEmail?.toLowerCase()).filter((e): e is string => Boolean(e)),
  );

  const atRisk: AtRiskUser[] = [];
  for (const user of getAllUsers()) {
    if (!user.createdAt) continue;
    const hours = (now - new Date(user.createdAt).getTime()) / (60 * 60 * 1000);
    if (hours < CHURN_AT_RISK_HOURS) continue;
    const email = user.email.toLowerCase();
    if (user.roles.includes("merchant") && !offerMerchantEmails.has(email)) {
      atRisk.push({ email: user.email, role: "merchant", hoursSinceSignup: Math.round(hours), createdAt: user.createdAt });
    }
    if (user.roles.includes("creator") && !applicationCreatorEmails.has(email)) {
      atRisk.push({ email: user.email, role: "creator", hoursSinceSignup: Math.round(hours), createdAt: user.createdAt });
    }
  }
  return atRisk.sort((a, b) => b.hoursSinceSignup - a.hoursSinceSignup);
}

// ---------------------------------------------------------------------------
// G10 — Analytics (P&L, Unit Economics, AI/Token costs)
// ---------------------------------------------------------------------------

export function getManualCostEntries(month: string): ManualCostEntry[] {
  return readRecord().manualCosts.filter((c) => c.month === month);
}

export function addManualCostEntry(month: string, label: string, amount: number, actorEmail: string): ManualCostEntry {
  const record = readRecord();
  const entry: ManualCostEntry = { id: newId("cost"), month, label, amount, enteredAt: new Date().toISOString() };
  record.manualCosts = [...record.manualCosts, entry];
  writeRecord(record);
  writeAudit({ action: "add_manual_cost_entry", targetType: "pnl", targetId: month, detail: `${label}: ${amount}` }, actorEmail);
  return entry;
}

export function getAiUsageEvents(): AiUsageEvent[] {
  return readRecord().aiUsageEvents;
}

/**
 * Analytics/Automated Monthly P&L's real formula: Revenue (platform fees) − Costs (Switch
 * processing fees + hosting + AI/token + other SaaS). Only `platformFeeRevenue` is real/
 * computed here (sum of Sale.platformFee for the month, across every merchant — a real number
 * this app actually has). Every other line is either a manual-entry total (hosting, other SaaS —
 * doc's own "manual monthly entry" fallback) or genuinely zero because no real cost data exists
 * yet (Switch's own processing fee, AI/token costs — this app's AI features call a real,
 * currently-unreachable backend and have logged zero real ai_usage_events). Never invented.
 */
export async function computeMonthlyPnl(month: string): Promise<MonthlyPnl> {
  const sales = (await getAllSalesAcrossMerchants()).filter((o) => {
    const d = new Date(o.sale.createdAt);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === month;
  });
  const platformFeeRevenue = Math.round(sales.reduce((sum, o) => sum + o.sale.platformFee, 0) * 100) / 100;
  const manualCosts = getManualCostEntries(month);
  const hostingCosts = manualCosts.filter((c) => c.label.toLowerCase().includes("hosting")).reduce((s, c) => s + c.amount, 0);
  const otherSaasCosts = manualCosts.filter((c) => !c.label.toLowerCase().includes("hosting")).reduce((s, c) => s + c.amount, 0);
  const aiCosts = getAiUsageEvents()
    .filter((e) => e.createdAt.startsWith(month))
    .reduce((s, e) => s + e.costCents / 100, 0);

  const existing = readRecord().pnlReports.find((p) => p.month === month);
  return {
    month,
    platformFeeRevenue,
    switchProcessingFees: 0, // no real Switch API integrated yet — see doc comment above
    hostingCosts,
    aiCosts: Math.round(aiCosts * 100) / 100,
    otherSaasCosts,
    finalized: existing?.finalized ?? false,
    generatedAt: new Date().toISOString(),
  };
}

/** Doc's own recommendation: finalize, don't edit a closed month in place — later corrections
 *  are separate manual-cost adjustment entries, not a re-run that silently changes history. */
export async function finalizeMonthlyPnl(month: string, actorEmail: string): Promise<MonthlyPnl> {
  const report = await computeMonthlyPnl(month);
  const finalized = { ...report, finalized: true };
  const record = readRecord();
  record.pnlReports = [...record.pnlReports.filter((p) => p.month !== month), finalized];
  writeRecord(record);
  writeAudit({ action: "finalize_pnl", targetType: "pnl", targetId: month }, actorEmail);
  return finalized;
}

/** Unit economics — asymmetric by role per the doc: merchants have real revenue (their share of
 *  platform fees), creators have $0 revenue by design and are measured on GMV driven instead. */
export interface MerchantUnitEconomics {
  email: string;
  revenue: number;
  netContribution: number;
}
export interface CreatorUnitEconomics {
  email: string;
  gmvDriven: number;
}

export async function getMerchantUnitEconomics(): Promise<MerchantUnitEconomics[]> {
  const sales = await getAllSalesAcrossMerchants();
  const merchants = await getAllMerchantEmails();
  return merchants.map((email) => {
    const own = sales.filter((o) => o.merchantEmail === email);
    const revenue = Math.round(own.reduce((s, o) => s + o.sale.platformFee, 0) * 100) / 100;
    // No real Switch/AI/hosting-allocation cost data per merchant yet (same gap as the P&L
    // above) — net contribution is revenue-only until those exist, not a fabricated deduction.
    return { email, revenue, netContribution: revenue };
  });
}

export async function getCreatorUnitEconomics(): Promise<CreatorUnitEconomics[]> {
  const sales = await getAllSalesAcrossMerchants();
  const byCreator = new Map<string, number>();
  for (const { sale } of sales) {
    byCreator.set(sale.creatorId, (byCreator.get(sale.creatorId) ?? 0) + sale.amount);
  }
  return Array.from(byCreator.entries()).map(([email, gmvDriven]) => ({ email, gmvDriven: Math.round(gmvDriven * 100) / 100 }));
}

// PLATFORM_FEE_RATE re-exported for the analytics UI's own "how platform fee revenue is
// computed" explainer text, rather than that screen hardcoding the number a second time.
export { PLATFORM_FEE_RATE };
