import type {
  MerchantRecord,
  Offer,
  Application,
  Sale,
  OverviewStats,
  BillingCycle,
  OfferEvent,
} from "./types";
import { getMockCreator } from "./mock-creators";
import { slugify } from "./format";
import { PLATFORM_FEE_RATE, TRACKING_LINK_ORIGIN, REFUND_CREDIT_MONTHLY_CAP } from "./constants";
import {
  notifyOfferPublished,
  notifyApplicationReceived,
  notifyApplicationApproved,
  notifyApplicationRejected,
  notifySale,
} from "@/lib/notifications/mock/store";
import { readAllMerchantRecords, writeAllMerchantRecords } from "./server-store";

/**
 * MOCK DATA LAYER — Merchant + shared Offer/Application/Sale domain (also read cross-account by
 * the Creator dashboard — see the "Creator-facing cross-account queries" section below).
 *
 * Stands in for real endpoints, grouped by resource (request/response shapes are the `Offer`/
 * `Application`/`Sale`/`BillingCycle`/`OverviewStats`/`OfferEvent` types this
 * file already imports from ./types.ts — each function's return type IS the response shape):
 *
 *   Offers:
 *     GET    /offers                       — getOffers
 *     GET    /offers/:id                   — getOffer / findOfferById (cross-account)
 *     GET    /offers/by-slug/:slug         — findOfferBySlug (cross-account, Playbook 08 A4)
 *     POST   /offers            NewOfferInput → Offer  — createOffer
 *     PATCH  /offers/:id        Partial<Offer>          — updateOffer / setOfferStatus
 *     DELETE /offers/:id                    — deleteOffer
 *     GET    /offers/discover               — getAllLiveOffersForDiscovery (public/creator-facing)
 *     POST   /offers/:id/clicks             — recordOfferClick   (§ real click-tracking gap, see file's own doc comment)
 *     POST   /offers/:id/cart-adds          — recordCartAdd
 *
 *   Applications:
 *     GET    /applications                          — getApplications
 *     GET    /applications/:id                       — getApplication / findApplicationById
 *     POST   /offers/:id/applications  { creatorId }  — applyToOffer (merchant-simulated) / applyToOfferAsCreator (real creator entry point, returns ApplyResult)
 *     POST   /applications/:id/approve                — approveApplication
 *     POST   /applications/:id/reject  { reason? }     — rejectApplication
 *
 *   Sales:
 *     GET    /sales                          — getSales
 *     GET    /sales/:id                      — getSale
 *     POST   /sales  { applicationId, amount } — recordMockSale (§ no real checkout exists — see doc comment)
 *     POST   /sales/:id/accept                — acceptSale
 *     POST   /sales/:id/refund-credit          — requestRefundCredit, returns RefundCreditResult (5/calendar-month/merchant cap, Playbook 07 G5 — fixed from the earlier incorrect 1/sale cap)
 *
 *   Billing cycles (what the merchant owes SellVia — platform fee + creator commissions,
 *   charged monthly per the real architecture, Money Flow doc 2026-08-07):
 *     GET  /billing-cycles              — getBillingCycles
 *     POST /billing-cycles/:id/retry    — retryBillingCycle
 *
 *   NOTE: there is deliberately no merchant-side "payouts" endpoint here. Under the real
 *   architecture SellVia bills the merchant and pays CREATORS from its own collected funds —
 *   SellVia never owes the merchant a payout. A merchant-side requestPayout/getPayoutRequests
 *   set existed here from an earlier pass, was never wired to any screen, and has been removed
 *   (this session's Payouts-placeholder audit) rather than built into a screen that would
 *   fabricate a money flow that doesn't exist. Real payout requests are creator-side —
 *   lib/creator/store.ts.
 *
 *   Aggregates:
 *     GET /overview/stats     — getOverviewStats, getOverviewTrends
 *     GET /overview/activity  — getRecentActivity
 *     GET /sales/daily-series — getDailySalesSeries
 *     GET /offers/:id/stats   — getOfferStats
 *     GET /sales/export.csv   — buildSalesCsv (async job client-side today; real version is a
 *                                backend-generated export, this function's output shape is the
 *                                CSV body contract either way)
 *
 *   Admin cross-account reads (Playbook 07 — real endpoints are `/admin/*`, not these paths;
 *   these exports exist so lib/admin/store.ts never touches this file's storage directly, same
 *   "one owning file per domain" rule the rest of this app already follows):
 *     getAllMerchantEmails, getAllOffersAcrossMerchants, getAllApplicationsAcrossMerchants,
 *     getAllSalesAcrossMerchants, getAllEventsAcrossMerchants, endAllOffersForMerchant (G4 suspend)
 *
 * Known mock-only deviation: every function takes `email` explicitly (the merchant's own, or a
 * creator's for the cross-account queries) to key the record — a real client infers "my own"
 * resources from the session/JWT and wouldn't pass it; admin-style cross-account lookups
 * (Playbook 07 G4/G6) are the one case where an explicit id param is correct as-is.
 *
 * PERSISTENCE (Playbook 09 fix — read this before touching readAll/writeAll below): this used
 * to be `localStorage`-backed, like every other lib/*\/store.ts in this app. That's scoped to
 * ONE browser profile — a real cross-account test (Merchant publishes in browser/profile A,
 * Creator browses Discover in a genuinely separate browser/profile B) silently failed, because
 * the two profiles were never reading the same storage at all. This is the one domain in the app
 * where that matters for real: Offers/Applications/Sales are inherently cross-account (a
 * Creator's Discover/Applications/Earnings screens, and every Admin cross-account read, all
 * depend on seeing a Merchant's data from a different browser). Every other domain
 * (lib/auth/mock/user-store.ts, lib/onboarding/store.ts, lib/creator/store.ts's own payout
 * records, lib/notifications/mock/store.ts, lib/admin/store.ts's own state, lib/support/
 * store.ts, lib/account/deletion.ts) is a single account's own data, read only by that same
 * account in that same browser — no cross-browser sharing was ever needed there, so those stay
 * on localStorage, unchanged.
 *
 * `readAll`/`writeAll` now call lib/merchant/server-store.ts's Server Actions, which persist to
 * a JSON file the Node process running `next dev`/`next start` owns — genuinely shared across
 * every browser that talks to this same dev server, the same way a real backend's database
 * would be. This is why every exported function below is `async` now (a network round-trip
 * can't be synchronous) — every one of this file's ~20 callers across the app was updated to
 * `await` it. Deliberately one connected store per merchant, not one table per screen —
 * Overview, Offers, Applications, and Sales all derive from the same `offers`/`applications`/
 * `sales` arrays, so an action on one screen is immediately visible on another (now genuinely
 * immediately, across browsers too, not just across tabs of the same one).
 */

async function readAll(): Promise<Record<string, MerchantRecord>> {
  return readAllMerchantRecords();
}

async function writeAll(all: Record<string, MerchantRecord>): Promise<void> {
  await writeAllMerchantRecords(all);
}

function emailKey(email: string) {
  return email.toLowerCase();
}

/**
 * Normalizes every field regardless of what's actually stored — a record existing but missing
 * an array field (e.g. written by an older code path, or a still-mid-write malformed row) must
 * never throw a "not iterable" crash in a caller that assumes the shape (see the real crash this
 * exact bug class caused, Playbook 07/08's own fix notes — same discipline, now against the
 * server-backed store instead of localStorage).
 */
async function getRecord(email: string): Promise<MerchantRecord> {
  const all = await readAll();
  const raw = all[emailKey(email)];
  return {
    offers: raw?.offers ?? [],
    applications: raw?.applications ?? [],
    sales: raw?.sales ?? [],
    events: raw?.events,
  };
}

async function saveRecord(email: string, record: MerchantRecord): Promise<void> {
  const all = await readAll();
  all[emailKey(email)] = record;
  await writeAll(all);
}

function newId(prefix: string): string {
  const rand = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return `${prefix}_${rand}`;
}

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

export async function getOffers(email: string): Promise<Offer[]> {
  return (await getRecord(email)).offers;
}

export async function getOffer(email: string, offerId: string): Promise<Offer | undefined> {
  return (await getRecord(email)).offers.find((o) => o.id === offerId);
}

/** Every offer's slug across every merchant account — product links live at one flat /products/
 *  namespace, so uniqueness has to be checked globally, not just within one merchant's own
 *  offers (mirrors getAllLiveOffersForDiscovery's same cross-account scan for the same reason). */
async function allSlugsInUse(): Promise<Set<string>> {
  const all = await readAll();
  return new Set(Object.values(all).flatMap((r) => (r.offers ?? []).map((o) => o.slug)));
}

/** "Glow Serum" -> "glow-serum", or "glow-serum-2" / "-3" on a collision — D3/D4's uniqueness
 *  check for the auto-generated tracking link. */
export async function generateUniqueSlug(productName: string): Promise<string> {
  const base = slugify(productName) || "offer";
  const taken = await allSlugsInUse();
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export type NewOfferInput = Omit<
  Offer,
  "id" | "merchantEmail" | "status" | "createdAt" | "slug" | "trackingLink" | "clicks"
>;

/**
 * Publishing sets the offer live immediately — MVP-demo default (Playbook 04 §2b). The real
 * spec's snippet-verification + Paddle-billing gates on draft→live aren't modeled server-side;
 * the two-gate publish checklist in the create form is a UI-level stand-in, not a real gate.
 *
 * Auto-generates the tracking link here (D2/D4's explicit requirement): a globally-unique slug
 * from the product name, then `${TRACKING_LINK_ORIGIN}/${slug}`. Generated once, at creation —
 * never regenerated on edit, since a changed link would break every copy a creator already
 * shared.
 */
export async function createOffer(email: string, input: NewOfferInput): Promise<Offer> {
  const record = await getRecord(email);
  const slug = await generateUniqueSlug(input.productName);
  const offer: Offer = {
    ...input,
    id: newId("offer"),
    merchantEmail: emailKey(email),
    slug,
    trackingLink: `${TRACKING_LINK_ORIGIN}/${slug}`,
    status: "live",
    createdAt: new Date().toISOString(),
    clicks: 0,
  };
  record.offers = [...record.offers, offer];
  await saveRecord(email, record);
  notifyOfferPublished(email, offer.id, offer.productName);
  return offer;
}

export async function updateOffer(email: string, offerId: string, patch: Partial<Offer>): Promise<Offer | undefined> {
  const record = await getRecord(email);
  let updated: Offer | undefined;
  record.offers = record.offers.map((o) => {
    if (o.id !== offerId) return o;
    // slug/trackingLink are immutable post-creation (see createOffer's doc comment) even if a
    // caller's patch object happens to include them.
    updated = { ...o, ...patch, id: o.id, merchantEmail: o.merchantEmail, slug: o.slug, trackingLink: o.trackingLink };
    return updated;
  });
  await saveRecord(email, record);
  return updated;
}

/** D2's four inline actions: pause/resume (toggle live<->paused), end (terminal, no more sales),
 *  archive (hidden from the default list view but not deleted). */
export async function setOfferStatus(email: string, offerId: string, status: Offer["status"]): Promise<Offer | undefined> {
  return updateOffer(email, offerId, { status });
}

/** Whether this offer's commission rate is still editable — locked after its first approved
 *  application. */
export async function isCommissionEditable(email: string, offerId: string): Promise<boolean> {
  const record = await getRecord(email);
  return !record.applications.some((a) => a.offerId === offerId && a.status === "approved");
}

/** Removes the offer and its applications/sales (nothing should reference a deleted offer
 *  afterward). Confirmation is the caller's job (components/reference/ui/confirm-dialog.tsx). */
export async function deleteOffer(email: string, offerId: string): Promise<void> {
  const record = await getRecord(email);
  record.offers = record.offers.filter((o) => o.id !== offerId);
  record.applications = record.applications.filter((a) => a.offerId !== offerId);
  record.sales = record.sales.filter((s) => s.offerId !== offerId);
  await saveRecord(email, record);
}

/** Cross-account offer lookup by id alone (Playbook 05 E3 — a creator browsing Discover only
 *  knows the offerId, never which merchant owns it). */
export async function findOfferById(offerId: string): Promise<Offer | undefined> {
  const all = await readAll();
  for (const record of Object.values(all)) {
    const found = (record.offers ?? []).find((o) => o.id === offerId);
    if (found) return found;
  }
  return undefined;
}

/** Cross-account offer lookup by slug (Playbook A4 — the public offer detail page's URL is
 *  `/offers/:slug`, matching TRACKING_LINK_ORIGIN's own `/[slug]` shape, not `/offers/:id`). Same
 *  linear scan as findOfferById — fine at this mock scale, a real backend would index on slug. */
export async function findOfferBySlug(slug: string): Promise<Offer | undefined> {
  const all = await readAll();
  for (const record of Object.values(all)) {
    const found = (record.offers ?? []).find((o) => o.slug === slug);
    if (found) return found;
  }
  return undefined;
}

/** Every live offer across every merchant account — the same data source the Creator dashboard's
 *  "Discover" screen reads from, not a separate creator-only dataset. */
export async function getAllLiveOffersForDiscovery(): Promise<Offer[]> {
  const all = await readAll();
  return Object.values(all)
    .flatMap((record) => record.offers ?? [])
    .filter((o) => o.status === "live");
}

async function pushEvent(email: string, event: OfferEvent): Promise<void> {
  const record = await getRecord(email);
  record.events = [...(record.events ?? []), event];
  await saveRecord(email, record);
}

/**
 * D1's mock click simulator — real click tracking needs a redirect/beacon endpoint at
 * `${TRACKING_LINK_ORIGIN}/[slug]` recording (creator ref, offer, timestamp) server-side, which
 * doesn't exist in this frontend-only build. This increments a local counter so the click/
 * conversion stat cards have real numbers to react to instead of being permanently zero; it is
 * NOT real attribution data. Flagged wherever it's surfaced in the UI, not silently presented as
 * live analytics.
 *
 * `creatorId`/`refCode` are optional (Playbook 05 E6) — present when a specific creator's own
 * link is being simulated (their Link Detail screen), absent for the generic/untargeted
 * simulator on the merchant's own Offer Detail screen. Either way this also appends a "click"
 * OfferEvent so a real (if simulated) timeline exists — see getEventsForApplication.
 */
export async function recordOfferClick(email: string, offerId: string, creatorId?: string, refCode?: string): Promise<Offer | undefined> {
  const offer = await getOffer(email, offerId);
  if (!offer) return undefined;
  const updated = await updateOffer(email, offerId, { clicks: offer.clicks + 1 });
  await pushEvent(email, { id: newId("evt"), offerId, stage: "click", at: new Date().toISOString(), creatorId, refCode });
  return updated;
}

/** Playbook 05 E6 — the "cart-add" stage of the mock timeline. Creator-attributed only (a
 *  cart-add with no known creator/link isn't meaningful to show on a per-link timeline). */
export async function recordCartAdd(email: string, offerId: string, creatorId: string, refCode: string): Promise<void> {
  await pushEvent(email, { id: newId("evt"), offerId, stage: "cart_add", at: new Date().toISOString(), creatorId, refCode });
}

export async function getOfferStats(email: string, offerId: string) {
  const record = await getRecord(email);
  const offer = record.offers.find((o) => o.id === offerId);
  const sales = record.sales.filter((s) => s.offerId === offerId);
  const clicks = offer?.clicks ?? 0;
  return {
    clicks,
    conversionRate: clicks > 0 ? (sales.length / clicks) * 100 : 0,
    totalSales: sales.reduce((sum, s) => sum + s.amount, 0),
    spend: sales.reduce((sum, s) => sum + s.commissionAmount, 0),
    applications: record.applications.filter((a) => a.offerId === offerId).length,
    approvedCreators: record.applications.filter((a) => a.offerId === offerId && a.status === "approved").length,
  };
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

export async function getApplications(email: string): Promise<Application[]> {
  return (await getRecord(email)).applications;
}

export async function getApplication(email: string, applicationId: string): Promise<Application | undefined> {
  return (await getRecord(email)).applications.find((a) => a.id === applicationId);
}

/** Simulates "a creator applies" — the direct writer, called both by the merchant-side "creator
 *  applies" simulator (with a mock roster id) and by applyToOfferAsCreator below (with a real
 *  session-derived creatorId). Guards against double-applying to the same offer. */
export async function applyToOffer(email: string, offerId: string, creatorId: string, creatorEmail?: string): Promise<Application | undefined> {
  const record = await getRecord(email);
  const alreadyApplied = record.applications.some((a) => a.offerId === offerId && a.creatorId === creatorId);
  if (alreadyApplied) return undefined;

  const application: Application = {
    id: newId("app"),
    offerId,
    creatorId,
    creatorEmail,
    status: "pending",
    appliedAt: new Date().toISOString(),
  };
  record.applications = [...record.applications, application];
  await saveRecord(email, record);

  const offer = record.offers.find((o) => o.id === offerId);
  const creator = getMockCreator(creatorId);
  notifyApplicationReceived(email, offerId, application.id, creator?.name ?? creatorEmail ?? "A creator", offer?.productName ?? "your offer");

  return application;
}

export type ApplyResult =
  | { ok: true; application: Application }
  | { ok: false; reason: "duplicate" | "self_dealing" | "not_found" };

/**
 * Playbook 05 E3's real entry point for the Creator's own "Apply" button — unlike applyToOffer
 * above, the caller here doesn't know which merchant owns the offer (a creator browsing Discover
 * only has an offerId), so this resolves that from the offer itself (offers already carry their
 * own `merchantEmail`, same field `getAllLiveOffersForDiscovery` scans on).
 *
 * Two real, distinct error reasons (E3's third case — "rate-limited" — is deliberately NOT a
 * separate mechanism: per explicit instruction, "max 1 application per offer" *is* the rate
 * limit here, so it shares the "duplicate" reason rather than adding a second, redundant check):
 * - "self_dealing": the offer's own merchant applying to promote their own offer.
 * - "duplicate": already applied to this offer (also covers the simplified rate-limit rule).
 */
export async function applyToOfferAsCreator(offerId: string, creatorId: string, creatorEmail: string): Promise<ApplyResult> {
  const all = await readAll();
  let merchantEmail: string | undefined;
  let offer: Offer | undefined;
  for (const [email, record] of Object.entries(all)) {
    const found = (record.offers ?? []).find((o) => o.id === offerId);
    if (found) {
      merchantEmail = email;
      offer = found;
      break;
    }
  }
  if (!offer || !merchantEmail) return { ok: false, reason: "not_found" };
  if (offer.merchantEmail === creatorEmail.toLowerCase()) return { ok: false, reason: "self_dealing" };

  const record = await getRecord(merchantEmail);
  const alreadyApplied = record.applications.some((a) => a.offerId === offerId && a.creatorId === creatorId);
  if (alreadyApplied) return { ok: false, reason: "duplicate" };

  const application = await applyToOffer(merchantEmail, offerId, creatorId, creatorEmail);
  return application ? { ok: true, application } : { ok: false, reason: "duplicate" };
}

/** e.g. "Maya Chen" -> "MAYA10" — matches the Domain Model's example discount-code shape ("MIA10"). */
function generateDiscountCode(creatorName: string): string {
  const prefix = creatorName.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase() || "SALE";
  const suffix = Math.floor(10 + Math.random() * 90);
  return `${prefix}${suffix}`;
}

/**
 * Approval must feel immediate, not queued (D6) — this is a synchronous local write, same as
 * every other mock mutation, so there's no artificial delay to fake.
 *
 * On approval the creator gets ACCESS to the offer's one canonical tracking link (D6's explicit
 * requirement), not a brand-new link of their own: `AffiliateLink.url` is the offer's
 * `trackingLink` with a `?ref=<creator-slug>-<random>` query param appended, which is what a real
 * click-tracking/attribution backend would key off to credit this specific creator (see
 * recordOfferClick's doc comment — that attribution layer doesn't exist here). `discountCode`
 * stays as the fallback attribution path per the Domain Model.
 */
export async function approveApplication(email: string, applicationId: string): Promise<Application | undefined> {
  const record = await getRecord(email);
  let updated: Application | undefined;
  record.applications = record.applications.map((a) => {
    if (a.id !== applicationId) return a;
    const creator = getMockCreator(a.creatorId);
    const creatorName = creator?.name ?? "creator";
    const offer = record.offers.find((o) => o.id === a.offerId);
    const refCode = `${slugify(creatorName)}-${Math.floor(100 + Math.random() * 900)}`;
    updated = {
      ...a,
      status: "approved",
      decidedAt: new Date().toISOString(),
      affiliateLink: {
        url: offer ? `${offer.trackingLink}?ref=${refCode}` : `${TRACKING_LINK_ORIGIN}?ref=${refCode}`,
        refCode,
        discountCode: generateDiscountCode(creatorName),
      },
    };
    return updated;
  });
  await saveRecord(email, record);
  if (updated?.creatorEmail) {
    const offer = record.offers.find((o) => o.id === updated!.offerId);
    notifyApplicationApproved(updated.creatorEmail, applicationId, offer?.productName ?? "an offer");
  }
  return updated;
}

/** `reason` is optional free text (Playbook 05 E4's "simplest version" — a note, not a reason-code
 *  enum) the merchant can leave when rejecting. Absent means the merchant didn't leave one; the
 *  Creator side shows "Not specified" for that case rather than inventing a reason. */
export async function rejectApplication(email: string, applicationId: string, reason?: string): Promise<Application | undefined> {
  const record = await getRecord(email);
  let updated: Application | undefined;
  record.applications = record.applications.map((a) => {
    if (a.id !== applicationId) return a;
    updated = { ...a, status: "rejected", decidedAt: new Date().toISOString(), rejectionReason: reason?.trim() || undefined };
    return updated;
  });
  await saveRecord(email, record);
  if (updated?.creatorEmail) {
    const offer = record.offers.find((o) => o.id === updated!.offerId);
    notifyApplicationRejected(updated.creatorEmail, offer?.productName ?? "an offer");
  }
  return updated;
}

// ---------------------------------------------------------------------------
// Sales
// ---------------------------------------------------------------------------

export async function getSales(email: string): Promise<Sale[]> {
  return (await getRecord(email)).sales;
}

export async function getSale(email: string, saleId: string): Promise<Sale | undefined> {
  return (await getRecord(email)).sales.find((s) => s.id === saleId);
}

/** Simulates a purchase through an approved creator's link (no real checkout/attribution — see
 *  recordOfferClick's doc comment for the same real-backend gap). Commission math: creator
 *  commission = amount × offer.commissionRate; platform fee = amount × PLATFORM_FEE_RATE
 *  (flagged placeholder, constants.ts); merchant keeps the rest. Only allowed against an approved
 *  application, matching the real rule that a Sale always belongs to an AffiliateLink. */
export async function recordMockSale(email: string, applicationId: string, amount: number): Promise<Sale | undefined> {
  const record = await getRecord(email);
  const application = record.applications.find((a) => a.id === applicationId);
  if (!application || application.status !== "approved") return undefined;
  const offer = record.offers.find((o) => o.id === application.offerId);
  if (!offer) return undefined;

  const commissionAmount = Math.round(amount * (offer.commissionRate / 100) * 100) / 100;
  const platformFee = Math.round(amount * PLATFORM_FEE_RATE * 100) / 100;
  const sale: Sale = {
    id: newId("sale"),
    applicationId,
    offerId: offer.id,
    creatorId: application.creatorId,
    amount,
    commissionAmount,
    platformFee,
    merchantAmount: Math.round((amount - commissionAmount - platformFee) * 100) / 100,
    status: "completed",
    acceptanceStatus: "pending",
    refundCreditStatus: "none",
    createdAt: new Date().toISOString(),
  };
  record.sales = [...record.sales, sale];
  record.events = [
    ...(record.events ?? []),
    {
      id: newId("evt"),
      offerId: offer.id,
      stage: "purchase",
      at: sale.createdAt,
      creatorId: application.creatorId,
      refCode: application.affiliateLink?.refCode,
      saleId: sale.id,
    },
  ];
  await saveRecord(email, record);
  notifySale(email, sale.id, offer.productName, application.creatorEmail, applicationId);
  return sale;
}

export async function acceptSale(email: string, saleId: string): Promise<Sale | undefined> {
  const record = await getRecord(email);
  let updated: Sale | undefined;
  record.sales = record.sales.map((s) => {
    if (s.id !== saleId) return s;
    updated = { ...s, acceptanceStatus: "accepted" };
    return updated;
  });
  await saveRecord(email, record);
  return updated;
}

export type RefundCreditResult =
  | { ok: true; sale: Sale }
  | { ok: false; reason: "already_requested" | "monthly_cap_reached" };

/**
 * D8 / Playbook 07 G5 — "Request Refund Credit with cap state." Real rule (Payments/Refund
 * Handling, confirmed 2026-08-07): **5 credits per calendar month, per merchant** — across all
 * their sales combined, not one-per-sale (the cap this function originally, incorrectly,
 * enforced — fixed here per Playbook 07's audit). The requested credit itself is always the
 * commission amount on that one sale (never more — "there's nothing bigger to refund against");
 * partial-refund proportionality (doc: "credit reduces proportionally to the returned portion")
 * isn't modeled here since this mock has no concept of a *partial* sale return yet — flagged,
 * not built.
 *
 * Two distinct block reasons, not one generic null (real-API-shaped result, matches
 * `applyToOfferAsCreator`'s `ApplyResult` pattern): this exact sale already has a request on it,
 * vs. the merchant's monthly cap is already used up by other sales. `undefined` = sale not found.
 */
export async function requestRefundCredit(email: string, saleId: string): Promise<RefundCreditResult | undefined> {
  const record = await getRecord(email);
  const existing = record.sales.find((s) => s.id === saleId);
  if (!existing) return undefined;
  if (existing.refundCreditStatus !== "none") return { ok: false, reason: "already_requested" };

  const now = new Date().toISOString();
  const thisMonth = monthKey(now);
  const creditsThisMonth = record.sales.filter(
    (s) => s.refundCreditStatus !== "none" && s.refundCreditRequestedAt && monthKey(s.refundCreditRequestedAt) === thisMonth,
  ).length;
  if (creditsThisMonth >= REFUND_CREDIT_MONTHLY_CAP) return { ok: false, reason: "monthly_cap_reached" };

  let updated: Sale | undefined;
  record.sales = record.sales.map((s) => {
    if (s.id !== saleId) return s;
    updated = { ...s, refundCreditStatus: "requested", refundCreditRequestedAt: now };
    return updated;
  });
  await saveRecord(email, record);
  return updated ? { ok: true, sale: updated } : undefined;
}

/** Playbook 07 G5 — Admin's own decision on a pending refund-credit request (requestRefundCredit
 *  only ever sets "requested"; something has to resolve it). `merchantEmail` is explicit here
 *  (not inferred) because the caller is Admin acting on someone else's account, the one
 *  legitimate case for an explicit cross-account id param per this file's own header note. */
export async function resolveRefundCredit(merchantEmail: string, saleId: string, decision: "approved" | "denied"): Promise<Sale | undefined> {
  const record = await getRecord(merchantEmail);
  let updated: Sale | undefined;
  record.sales = record.sales.map((s) => {
    if (s.id !== saleId || s.refundCreditStatus !== "requested") return s;
    updated = { ...s, refundCreditStatus: decision };
    return updated;
  });
  if (updated) await saveRecord(merchantEmail, record);
  return updated;
}

// ---------------------------------------------------------------------------
// Billing cycles (D9) — computed from `sales`, not a separately-written table, so it can never
// drift out of sync with the sales it summarizes.
// ---------------------------------------------------------------------------

/** Groups sales by calendar month of `createdAt`. The current month is "open"; every prior month
 *  is deterministically mock-assigned charged/failed so the failure + retry-count UI is actually
 *  reachable in a demo, not just theoretical (same "make the edge case reachable" reasoning as
 *  the Shopify mock adapter's `?fail` convention in Playbook 02). */
export async function getBillingCycles(email: string): Promise<BillingCycle[]> {
  const record = await getRecord(email);
  const byMonth = new Map<string, Sale[]>();
  for (const sale of record.sales) {
    const d = new Date(sale.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, [...(byMonth.get(key) ?? []), sale]);
  }

  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, sales], index) => {
      const [year, month] = key.split("-").map(Number);
      const periodStart = new Date(year, month - 1, 1).toISOString();
      const periodEnd = new Date(year, month, 0).toISOString();
      const totalOwed = sales.reduce((sum, s) => sum + s.commissionAmount, 0);
      const isCurrent = key === currentKey;
      // Deterministic (index-based, not random) so a page refresh doesn't reshuffle which past
      // cycle demos the "failed" state.
      const status: BillingCycle["status"] = isCurrent ? "open" : index % 3 === 1 ? "failed" : "charged";
      return {
        id: `cycle_${key}`,
        periodStart,
        periodEnd,
        status,
        totalOwed,
        retryCount: status === "failed" ? 1 : 0,
      };
    });
}

/** Mock retry — flips a failed cycle back to pending_charge and bumps its retry count. No real
 *  billing provider is called (same class of gap as Playbook 02's C2 billing mock adapter). Pure
 *  function, no storage access — stays synchronous. */
export function retryBillingCycle(cycles: BillingCycle[], cycleId: string): BillingCycle[] {
  return cycles.map((c) =>
    c.id === cycleId && c.status === "failed"
      ? { ...c, status: "pending_charge", retryCount: c.retryCount + 1 }
      : c,
  );
}

// ---------------------------------------------------------------------------
// Sales export (D7) — a real client-side CSV, not a fake download. Wrapped in a delay by the
// caller to simulate an async job rather than a blocking spinner (no backend job queue exists).
// ---------------------------------------------------------------------------

/** Pure function, no storage access — stays synchronous. */
export function buildSalesCsv(sales: Sale[]): string {
  const header = "id,offerId,creatorId,amount,commissionAmount,platformFee,merchantAmount,acceptanceStatus,createdAt";
  const rows = sales.map((s) =>
    [s.id, s.offerId, s.creatorId, s.amount, s.commissionAmount, s.platformFee, s.merchantAmount, s.acceptanceStatus, s.createdAt].join(","),
  );
  return [header, ...rows].join("\n");
}

// ---------------------------------------------------------------------------
// Overview stats (D1) — recomputed live from the same store, never hardcoded
// ---------------------------------------------------------------------------

export async function getOverviewStats(email: string): Promise<OverviewStats> {
  const record = await getRecord(email);
  const totalClicks = record.offers.reduce((sum, o) => sum + o.clicks, 0);
  const totalSalesCount = record.sales.length;
  return {
    totalClicks,
    conversionRate: totalClicks > 0 ? (totalSalesCount / totalClicks) * 100 : 0,
    totalSales: record.sales.reduce((sum, s) => sum + s.amount, 0),
    totalSpend: record.sales.reduce((sum, s) => sum + s.commissionAmount, 0),
    activeOffers: record.offers.filter((o) => o.status === "live").length,
    pendingApplications: record.applications.filter((a) => a.status === "pending").length,
    totalApplications: record.applications.length,
  };
}

/** D1's "recent activity" feed — offers created, applications received/approved, sales, and
 *  payout requests, merged by timestamp. Generic `{id, kind, message, at}` shape so the
 *  component rendering it doesn't need to know about four different record types. */
export interface ActivityItem {
  id: string;
  kind: "offer" | "application" | "application_approved" | "sale" | "click";
  message: string;
  at: string;
}

export async function getRecentActivity(email: string, limit = 8): Promise<ActivityItem[]> {
  const record = await getRecord(email);
  const items: ActivityItem[] = [
    ...record.offers.map((o) => ({ id: o.id, kind: "offer" as const, message: `"${o.productName}" was published`, at: o.createdAt })),
    ...record.applications.map((a) => {
      const creator = getMockCreator(a.creatorId);
      const offer = record.offers.find((o) => o.id === a.offerId);
      return {
        id: a.id,
        kind: "application" as const,
        message: `${creator?.name ?? "A creator"} applied to "${offer?.productName ?? "an offer"}"`,
        at: a.appliedAt,
      };
    }),
    ...record.applications
      .filter((a) => a.status === "approved" && a.decidedAt)
      .map((a) => {
        const creator = getMockCreator(a.creatorId);
        const offer = record.offers.find((o) => o.id === a.offerId);
        return {
          id: `${a.id}-approved`,
          kind: "application_approved" as const,
          message: `${creator?.name ?? "A creator"} was approved for "${offer?.productName ?? "an offer"}"`,
          at: a.decidedAt as string,
        };
      }),
    ...record.sales.map((s) => {
      const offer = record.offers.find((o) => o.id === s.offerId);
      return { id: s.id, kind: "sale" as const, message: `New sale on "${offer?.productName ?? "an offer"}"`, at: s.createdAt };
    }),
  ];
  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Overview trends + sales series (D1 refresh) — month-over-month % change where there's enough
// history to mean anything, and a real daily sales series for the chart. Both computed live from
// `sales`/`applications`, nothing pre-aggregated/stored separately.
// ---------------------------------------------------------------------------

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** null = not enough history to mean anything (previous period has zero activity, so a percent
 *  change would either divide by zero or overstate a first-ever data point as "+∞%") — callers
 *  show a "not enough data yet" placeholder instead of a fake number, per explicit instruction. */
function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export interface OverviewTrends {
  totalSales: number | null;
  /** Always null — offer status has no history/snapshot to compare against (only the current
   *  status is stored), so "active offers vs. last month" isn't a real number this store can
   *  produce, not just a sparse-data gap. Kept as a field (not omitted) so the UI has one
   *  consistent "trend | null" shape to render for all four stat cards. */
  activeOffers: null;
  applications: number | null;
  totalPayouts: number | null;
}

export async function getOverviewTrends(email: string): Promise<OverviewTrends> {
  const record = await getRecord(email);
  const now = new Date();
  const thisMonth = monthKey(now.toISOString());
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = monthKey(lastMonthDate.toISOString());

  const sumBy = <T,>(items: T[], getAt: (i: T) => string, getValue: (i: T) => number, month: string) =>
    items.filter((i) => monthKey(getAt(i)) === month).reduce((sum, i) => sum + getValue(i), 0);

  const salesThis = sumBy(record.sales, (s) => s.createdAt, (s) => s.amount, thisMonth);
  const salesLast = sumBy(record.sales, (s) => s.createdAt, (s) => s.amount, lastMonth);
  const spendThis = sumBy(record.sales, (s) => s.createdAt, (s) => s.commissionAmount, thisMonth);
  const spendLast = sumBy(record.sales, (s) => s.createdAt, (s) => s.commissionAmount, lastMonth);
  const appsThis = record.applications.filter((a) => monthKey(a.appliedAt) === thisMonth).length;
  const appsLast = record.applications.filter((a) => monthKey(a.appliedAt) === lastMonth).length;

  return {
    totalSales: percentChange(salesThis, salesLast),
    activeOffers: null,
    applications: percentChange(appsThis, appsLast),
    totalPayouts: percentChange(spendThis, spendLast),
  };
}

/** Real daily sales totals for the Sales Overview chart — no interpolation/smoothing, a day with
 *  no sales is a real 0, not omitted (an empty-looking recent chart is honest, not a bug). */
export async function getDailySalesSeries(email: string, days: 7 | 30): Promise<{ label: string; value: number }[]> {
  const record = await getRecord(email);
  const out: { label: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    const next = new Date(day);
    next.setDate(day.getDate() + 1);
    const total = record.sales
      .filter((s) => {
        const t = new Date(s.createdAt).getTime();
        return t >= day.getTime() && t < next.getTime();
      })
      .reduce((sum, s) => sum + s.amount, 0);
    out.push({ label: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }), value: total });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Creator-facing cross-account queries (Playbook 05) — applications/sales/events are stored per
// *merchant* record (the shape Playbook 04 already established), so anything reading "this
// creator's own X" has to scan every merchant's record, the same pattern
// getAllLiveOffersForDiscovery already uses for the same reason. Each result carries the owning
// merchantEmail alongside the record, since Creator routes only ever know a creatorId/applicationId,
// never which merchant it belongs to ahead of time.
// ---------------------------------------------------------------------------

export interface OwnedApplication { merchantEmail: string; offer: Offer; application: Application }
export interface OwnedSale { merchantEmail: string; offer: Offer; sale: Sale }

export async function findApplicationById(applicationId: string): Promise<OwnedApplication | undefined> {
  const all = await readAll();
  for (const [merchantEmail, record] of Object.entries(all)) {
    const application = (record.applications ?? []).find((a) => a.id === applicationId);
    if (!application) continue;
    const offer = (record.offers ?? []).find((o) => o.id === application.offerId);
    if (!offer) continue;
    return { merchantEmail, offer, application };
  }
  return undefined;
}

export async function getApplicationsForCreator(creatorId: string): Promise<OwnedApplication[]> {
  const all = await readAll();
  const out: OwnedApplication[] = [];
  for (const [merchantEmail, record] of Object.entries(all)) {
    for (const application of record.applications ?? []) {
      if (application.creatorId !== creatorId) continue;
      const offer = (record.offers ?? []).find((o) => o.id === application.offerId);
      if (offer) out.push({ merchantEmail, offer, application });
    }
  }
  return out.sort((a, b) => new Date(b.application.appliedAt).getTime() - new Date(a.application.appliedAt).getTime());
}

export async function getSalesForCreator(creatorId: string): Promise<OwnedSale[]> {
  const all = await readAll();
  const out: OwnedSale[] = [];
  for (const [merchantEmail, record] of Object.entries(all)) {
    for (const sale of record.sales ?? []) {
      if (sale.creatorId !== creatorId) continue;
      const offer = (record.offers ?? []).find((o) => o.id === sale.offerId);
      if (offer) out.push({ merchantEmail, offer, sale });
    }
  }
  return out.sort((a, b) => new Date(b.sale.createdAt).getTime() - new Date(a.sale.createdAt).getTime());
}

/** Playbook 05 E5's per-link click/sale summary — one application's own numbers, not the whole
 *  offer's (an offer can have several approved creators, each with their own link). */
export async function getLinkStats(applicationId: string) {
  const owned = await findApplicationById(applicationId);
  if (!owned) return { clicks: 0, cartAdds: 0, sales: 0, commissionEarned: 0 };
  const { merchantEmail, application } = owned;
  const record = await getRecord(merchantEmail);
  const refCode = application.affiliateLink?.refCode;
  const events = (record.events ?? []).filter((e) =>
    e.offerId === application.offerId && (refCode ? e.refCode === refCode : e.creatorId === application.creatorId),
  );
  const sales = record.sales.filter((s) => s.applicationId === applicationId);
  return {
    clicks: events.filter((e) => e.stage === "click").length,
    cartAdds: events.filter((e) => e.stage === "cart_add").length,
    sales: sales.length,
    commissionEarned: Math.round(sales.reduce((sum, s) => sum + s.commissionAmount, 0) * 100) / 100,
  };
}

/** Playbook 05 E6 — one link's click → cart-add → purchase timeline. Matches on the
 *  application's own `refCode` where an event carries one (attributed clicks/cart-adds/
 *  purchases), falling back to creatorId+offerId match for older events with no refCode. */
export async function getEventsForApplication(applicationId: string): Promise<OfferEvent[]> {
  const owned = await findApplicationById(applicationId);
  if (!owned) return [];
  const { merchantEmail, application } = owned;
  const record = await getRecord(merchantEmail);
  const refCode = application.affiliateLink?.refCode;
  return (record.events ?? [])
    .filter((e) => e.offerId === application.offerId && (refCode ? e.refCode === refCode : e.creatorId === application.creatorId))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

/**
 * Playbook 05 E7 — "billed-and-charged commissions only," distinct from a merchant's own
 * "totalSpend" (which includes not-yet-billed commission). Re-derives each source merchant's own
 * billing-cycle status (getBillingCycles, Playbook 04 D9) per calendar month and only counts a
 * sale's commission once that sale's month has actually reached "charged" there.
 */
export async function getCreatorEarningsSummary(creatorId: string) {
  const owned = await getSalesForCreator(creatorId);
  let billedAndCharged = 0;
  let totalEarned = 0;
  const chargedMonthsByMerchant = new Map<string, Set<string>>();

  for (const { merchantEmail, sale } of owned) {
    totalEarned += sale.commissionAmount;
    if (!chargedMonthsByMerchant.has(merchantEmail)) {
      const cycles = await getBillingCycles(merchantEmail);
      const charged = new Set(cycles.filter((c) => c.status === "charged").map((c) => monthKey(c.periodStart)));
      chargedMonthsByMerchant.set(merchantEmail, charged);
    }
    const chargedMonths = chargedMonthsByMerchant.get(merchantEmail)!;
    if (chargedMonths.has(monthKey(sale.createdAt))) billedAndCharged += sale.commissionAmount;
  }

  return {
    billedAndCharged: Math.round(billedAndCharged * 100) / 100,
    totalEarned: Math.round(totalEarned * 100) / 100,
    saleCount: owned.length,
  };
}

/** Every "click" event attributed to this creator (any refCode/offer), across every merchant —
 *  Playbook 05 E1's own Clicks stat card. */
export async function getCreatorClickCount(creatorId: string): Promise<number> {
  const all = await readAll();
  let count = 0;
  for (const record of Object.values(all)) {
    count += (record.events ?? []).filter((e) => e.stage === "click" && e.creatorId === creatorId).length;
  }
  return count;
}

/** E1's recent-activity feed, scoped to one creator: applications decided, sales, and link
 *  clicks — same generic `{id, kind, message, at}` shape as the merchant Overview's
 *  getRecentActivity, so both dashboards' activity components could share one renderer. */
export async function getRecentActivityForCreator(creatorId: string, limit = 8): Promise<ActivityItem[]> {
  const applications = await getApplicationsForCreator(creatorId);
  const sales = await getSalesForCreator(creatorId);
  const all = await readAll();

  const items: ActivityItem[] = [
    ...applications
      .filter((o) => o.application.status !== "pending" && o.application.decidedAt)
      .map((o) => ({
        id: `${o.application.id}-decided`,
        kind: (o.application.status === "approved" ? "application_approved" : "application") as ActivityItem["kind"],
        message:
          o.application.status === "approved"
            ? `Approved for "${o.offer.productName}"`
            : `Application to "${o.offer.productName}" was not approved`,
        at: o.application.decidedAt as string,
      })),
    ...sales.map((o) => ({ id: o.sale.id, kind: "sale" as const, message: `Sale on "${o.offer.productName}"`, at: o.sale.createdAt })),
    ...Object.values(all).flatMap((record) =>
      (record.events ?? [])
        .filter((e) => e.stage === "click" && e.creatorId === creatorId)
        .map((e) => ({ id: e.id, kind: "click" as const, message: "Your link was clicked", at: e.at })),
    ),
  ];
  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Admin-facing cross-account exports (Playbook 07) — the ONLY way lib/admin/store.ts is allowed
// to read Offer/Application/Sale/Event data: through these, never by touching this file's
// storage directly (one isolated data-layer file per domain — admin's own store owns admin-only
// state; this file stays the single source for everything merchant-shaped, even when an admin
// screen is the one reading it). Real payout requests are creator-side, not merchant-side — see
// lib/creator/store.ts's own getAllPayoutRequestsAcrossCreators.
// ---------------------------------------------------------------------------

export interface OwnedOfferEvent { merchantEmail: string; event: OfferEvent }

export async function getAllMerchantEmails(): Promise<string[]> {
  return Object.keys(await readAll());
}

// The functions below read raw readAll() records directly, bypassing getRecord()'s own
// normalization — every `?? []` here is load-bearing, not decorative (see getRecord's own doc
// comment for the real crash this class of bug caused).

export async function getAllOffersAcrossMerchants(): Promise<Offer[]> {
  return Object.values(await readAll()).flatMap((r) => r.offers ?? []);
}

export async function getAllApplicationsAcrossMerchants(): Promise<OwnedApplication[]> {
  const all = await readAll();
  const out: OwnedApplication[] = [];
  for (const [merchantEmail, record] of Object.entries(all)) {
    for (const application of record.applications ?? []) {
      const offer = (record.offers ?? []).find((o) => o.id === application.offerId);
      if (offer) out.push({ merchantEmail, offer, application });
    }
  }
  return out;
}

export async function getAllSalesAcrossMerchants(): Promise<OwnedSale[]> {
  const all = await readAll();
  const out: OwnedSale[] = [];
  for (const [merchantEmail, record] of Object.entries(all)) {
    for (const sale of record.sales ?? []) {
      const offer = (record.offers ?? []).find((o) => o.id === sale.offerId);
      if (offer) out.push({ merchantEmail, offer, sale });
    }
  }
  return out;
}

export async function getAllEventsAcrossMerchants(): Promise<OwnedOfferEvent[]> {
  const all = await readAll();
  const out: OwnedOfferEvent[] = [];
  for (const [merchantEmail, record] of Object.entries(all)) {
    for (const event of record.events ?? []) out.push({ merchantEmail, event });
  }
  return out;
}

/** G4's suspend action needs to actually stop a merchant transacting — the honest mock version:
 *  force every one of that merchant's live/paused offers to "ended". Nothing about the
 *  *account* (login, session) is touched here — that's Auth's own domain
 *  (lib/auth/mock/user-store.ts), out of this file's scope; lib/admin/store.ts's suspendUser
 *  composes both. */
export async function endAllOffersForMerchant(merchantEmail: string): Promise<number> {
  const record = await getRecord(merchantEmail);
  let count = 0;
  record.offers = record.offers.map((o) => {
    if (o.status !== "live" && o.status !== "paused") return o;
    count++;
    return { ...o, status: "ended" as const };
  });
  if (count > 0) await saveRecord(merchantEmail, record);
  return count;
}
