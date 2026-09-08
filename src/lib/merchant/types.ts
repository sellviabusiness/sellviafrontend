export type ProductType = "physical" | "digital";
export type OfferStatus = "live" | "paused" | "ended" | "archived";

/**
 * Renamed from "Campaign" to "Offer" (Playbook 04 rename — matches the merchant nav's own
 * pre-existing "Offers" label, which had drifted ahead of the code). "draft" doesn't exist as a
 * reachable status: publishing sets an offer live immediately (MVP-demo default, Playbook 04
 * §2b) once the two-gate publish checklist is confirmed client-side — the real spec's
 * snippet-verification + Paddle-billing server gates are still not modeled here, only a UI-level
 * "did you actually check both boxes" gate now stands in for them (flagged, not silently upgraded
 * to a real gate).
 */
export interface Offer {
  id: string;
  merchantEmail: string;
  productName: string;
  /** URL-safe, globally unique across every merchant account in this mock store (real product
   *  links live at one flat /products/ namespace) — see store.ts's generateUniqueSlug. */
  slug: string;
  /** `https://sellvia.com/products/${slug}` — generated once at creation, never changes even if
   *  productName is edited later (a changed slug would break every link already shared). */
  trackingLink: string;
  /** PKR, whole rupees — no fractional paisa in this MVP's inputs/display. */
  price: number;
  category: string;
  productType: ProductType;
  /** Physical-only fields — hidden entirely from the form/detail view for digital offers. */
  shippingWeightGrams?: number;
  shippingNotes?: string;
  /** 10–40, per Domain Model's commission slider range. Editable until the first application is
   *  approved on this offer, then locked. */
  commissionRate: number;
  description: string;
  imageDataUrl?: string;
  status: OfferStatus;
  createdAt: string;
  /** Mock click counter — see store.ts's recordOfferClick doc comment for why this is a frontend
   *  simulator, not real click tracking. */
  clicks: number;
}

/**
 * The REAL Offer shape (API-ENDPOINTS.md, 2026-09-05) — deliberately a separate type from `Offer`
 * above rather than a reconciled superset: the two don't just differ by a few fields, they model
 * different things. Mock `Offer` generates its own shareable tracking link at creation and has no
 * concept of an external product page; real offers have no offer-level link at all (only a
 * creator's own AffiliateLink, created on application approval, is ever shareable) and instead
 * point at `productUrl`. Mock has description/image/shipping fields with no real backend home;
 * real has `publishedAt`/`updatedAt` the mock never tracked. Forcing one shared type would mean
 * every field on it is a lie in one mode or the other — see real-store.ts and the real-mode view
 * components (real-offers-view.tsx etc.) for where this type is actually used, fully separate
 * from the mock views built around `Offer`.
 */
export type RealOfferStatus = "draft" | "pending_vetting" | "live" | "paused" | "ended";

export interface RealOffer {
  id: string;
  merchantProfileId: string;
  name: string;
  priceCents: number;
  currency: string;
  category: ProductType;
  commissionRate: number;
  productUrl: string;
  /** Persisted (backend added it, 2026-09-06, b2a7520) — populated from prefill at creation,
   *  never re-fetched/re-validated server-side, same trust level as productUrl itself. */
  imageUrl: string | null;
  status: RealOfferStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * The REAL Application shape (API-ENDPOINTS.md, 2026-09-06 — the creatorX fields shipped in
 * response to this app's own ask, "let a merchant see who actually applied": ApplicationRead
 * originally had nothing but an opaque creatorProfileId). Snapshotted once at submission time
 * (same pattern as AffiliateLink.lockedCommissionRate), not a live join — what a merchant judged
 * the applicant on when reviewing, not whatever the creator's profile says today. `creatorName`
 * is nullable for real reasons (some legacy User rows have no `name` set), not an oversight —
 * always guard for it, never assume it's there. No `rejectionReason` field: reject takes no
 * request body at all in the real contract, unlike the mock's free-text reason.
 */
export type RealApplicationStatus = "pending" | "approved" | "rejected";

export interface RealApplication {
  id: string;
  offerId: string;
  creatorProfileId: string;
  status: RealApplicationStatus;
  audienceSnippet?: string;
  creatorName: string | null;
  creatorNiche: string | null;
  creatorAudienceSize: number;
  creatorEngagementRate: number | null;
  creatorPlatform: string | null;
  creatorHandle: string | null;
  createdAt: string;
  updatedAt: string;
}

/** `GET /affiliate-links` (creator-only) — own links only, created only as a side effect of
 *  application approval, no create endpoint at all. `slug` is what `/go/{slug}` (served by the
 *  backend directly, not `/api/v1`) resolves. */
export interface RealAffiliateLink {
  id: string;
  applicationId: string;
  offerId: string;
  slug: string;
  discountCode: string;
  lockedCommissionRate: number;
  createdAt: string;
  updatedAt: string;
}

export type CreatorPlatform = "instagram" | "tiktok" | "youtube" | "other";

/** Fixed demo roster — not random/placeholder text, per instruction. Shared, not merchant-owned
 *  data (lib/merchant/mock-creators.ts). */
export interface MockCreatorProfile {
  id: string;
  name: string;
  platform: CreatorPlatform;
  audienceSize: number;
  /** Percent, e.g. 4.2 — D5's "engagement rate" column. */
  engagementRate: number;
  niche: string;
}

export type ApplicationStatus = "pending" | "approved" | "rejected";

/**
 * Domain Model: AffiliateLink carries the creator's personalized tracking link plus a unique
 * discount_code — the fallback attribution path for when link-based tracking fails. The link
 * itself is now the OFFER's own canonical trackingLink with a per-creator `?ref=` code appended
 * (not a separate merchant-generated link per approval, the old model this replaces) — every
 * approved creator shares the same canonical /products/ URL, differentiated only by that query
 * param, which is what real click-tracking/attribution would key off server-side.
 */
export interface AffiliateLink {
  url: string;
  refCode: string;
  discountCode: string;
}

export interface Application {
  id: string;
  offerId: string;
  creatorId: string;
  /** Real session email, set only when applyToOfferAsCreator (Playbook 05's real apply flow)
   *  created this application — absent for the merchant-side mock-roster simulator, which has no
   *  real account to notify. Playbook 06 F1 needs this: creatorId (lib/creator/identity.ts's
   *  temporary email-derived stand-in) is a one-way slug, not reversible back to an email, so
   *  notifying a real creator by email requires storing it at application time, not deriving it. */
  creatorEmail?: string;
  status: ApplicationStatus;
  appliedAt: string;
  decidedAt?: string;
  affiliateLink?: AffiliateLink;
  /** Optional merchant-entered note on rejection (Playbook 05 E4's "simplest version" default —
   *  a free-text field, not a reason-code enum). Absent means the merchant didn't leave one; the
   *  Creator side shows "Not specified" rather than blank in that case, never invents a reason. */
  rejectionReason?: string;
}

export type SaleStatus = "completed" | "pending";
/** D7's "acceptance_status" column — separate from `status` (delivery/fulfillment), this tracks
 *  whether the merchant has acknowledged/accepted the reported sale into their records. */
export type SaleAcceptanceStatus = "pending" | "accepted";
export type RefundCreditStatus = "none" | "requested" | "approved" | "denied";

/**
 * The merchant's side of the shared Receipt record (Product Glossary). Mock sales are recorded
 * as "completed" immediately — the real spec's reported-vs-verified distinction isn't modeled
 * with a separate verify step in this MVP.
 */
export interface Sale {
  id: string;
  applicationId: string;
  offerId: string;
  creatorId: string;
  amount: number;
  /** What the merchant owes the creator — amount × offer.commissionRate, before either side's
   *  platform fee. */
  commissionAmount: number;
  /** SellVia's cut from the merchant's side — 1% of `amount` (MERCHANT_PLATFORM_FEE_RATE,
   *  constants.ts), billed to the merchant on top of `commissionAmount`. Confirmed real rate,
   *  2026-09-06 — no longer the earlier flat-5%-merchant-only placeholder. */
  merchantPlatformFee: number;
  /** SellVia's cut from the creator's side — 1% of `commissionAmount` (CREATOR_PLATFORM_FEE_RATE),
   *  deducted from what the creator is actually paid. New field; the mock previously paid
   *  creators their full commission with no fee taken at all. */
  creatorPlatformFee: number;
  /** Combined platform revenue from this sale (merchantPlatformFee + creatorPlatformFee) — what
   *  admin P&L sums; both streams count as platform revenue regardless of which side paid it. */
  platformFee: number;
  /**
   * What the merchant is actually billed for this sale (commissionAmount + merchantPlatformFee),
   * collected via the monthly billing cycle — a LIABILITY, not a residual. Despite the name
   * (kept for continuity with every existing display/export), this isn't money left over for the
   * merchant to "keep": SellVia never touches `amount` at all — the merchant already collected
   * the full sale amount directly through their own Shopify checkout. This is what they owe on
   * top of it, not what's left after a cut.
   */
  merchantAmount: number;
  /** What the creator actually receives for this sale (commissionAmount − creatorPlatformFee) —
   *  the real net payout amount, distinct from the gross commissionAmount above. */
  creatorPayout: number;
  status: SaleStatus;
  acceptanceStatus: SaleAcceptanceStatus;
  billingCycleId?: string;
  refundCreditStatus: RefundCreditStatus;
  /** Playbook 07 G5 — when the credit request was made (distinct from the sale's own
   *  `createdAt`), needed to enforce the real "5 credits per calendar month per merchant" cap
   *  (Payments/Refund Handling) — the cap counts requests by the month they were REQUESTED in,
   *  not the month the underlying sale happened. */
  refundCreditRequestedAt?: string;
  createdAt: string;
}

/**
 * Playbook 05 E6 — a basic mock event log so a link's click → cart-add → purchase timeline has
 * real (if simulated) data, same spirit as `Offer.clicks`'s existing click simulator. `refCode`
 * ties an event to one specific creator's copy of the link (from `AffiliateLink.refCode`) —
 * absent on a generic/unattributed click (e.g. the merchant-side "Simulate a click" button on
 * Offer detail, which has no creator context). "purchase" events are always real, generated
 * alongside an actual `Sale` record (see `recordMockSale`), not simulated separately.
 */
export type OfferEventStage = "click" | "cart_add" | "purchase";
export interface OfferEvent {
  id: string;
  offerId: string;
  stage: OfferEventStage;
  at: string;
  creatorId?: string;
  refCode?: string;
  /** Present on "purchase" events — links the event back to the Sale it represents. */
  saleId?: string;
}

export type BillingCycleStatus = "open" | "pending_charge" | "charged" | "failed";

/** D9 — one billing period's worth of owed commission, computed/mock-generated from `sales`
 *  grouped by calendar month rather than stored as its own separate write path (so it can never
 *  drift from the sales it summarizes). */
export interface BillingCycle {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: BillingCycleStatus;
  totalOwed: number;
  retryCount: number;
}

/**
 * Real Sale/BillingCycle/RefundRequest shapes (API-ENDPOINTS.md) — separate from the mock's
 * `Sale`/`BillingCycle` above for the same reason `RealOffer`/`RealApplication` are: not a
 * reconciled superset, a genuinely different shape. Notably `RealSale` has no `offerId` or
 * creator info at all (only `affiliateLinkId`, unresolvable — no merchant-facing endpoint maps
 * it back to an offer/creator; ask sent) and no per-sale fee breakdown (only the raw amount —
 * commission/platform-fee math only exists in aggregate, at the billing-cycle level).
 */
export type RealSaleStatus = "reported" | "accepted" | "rejected" | "billed" | "refunded";

export interface RealSale {
  id: string;
  affiliateLinkId: string;
  merchantProfileId: string;
  externalOrderId: string;
  amountCents: number;
  currency: string;
  status: RealSaleStatus;
  billingCycleId: string | null;
  createdAt: string;
}

export type RealBillingCycleStatus = "open" | "pending_charge" | "charged" | "failed" | "retrying" | "suspended";

export interface RealBillingCycle {
  id: string;
  periodStart: string;
  periodEnd: string;
  amountCents: number;
  currency: string;
  status: RealBillingCycleStatus;
  swichInvoiceId: string | null;
  failedAttempts: number;
}

export type RealRefundRequestStatus = "pending" | "approved" | "denied";

export interface RealRefundRequest {
  id: string;
  saleId: string;
  merchantProfileId: string;
  requestedAmountCents: number;
  status: RealRefundRequestStatus;
  resolvedByAdminId: string | null;
  resolutionNote: string | null;
  billingCreditId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Real Payout/payout-method shapes (API-ENDPOINTS.md) — no threshold at all in the real model
 * (2026-08-28 founder decision reversed the mock's $50/PKR-threshold design entirely): monthly
 * cadence, full balance, no partial cashout. `RealPayoutMethodValue` uses the backend's own
 * enum (`bank_transfer`, not the mock's `"bank"` shorthand) — raw account/IBAN/wallet numbers
 * are sent but never stored anywhere in SellVia's own database (forwarded to Swich, discarded).
 */
export type RealPayoutStatus = "pending" | "processing" | "paid" | "failed";

export interface RealPayout {
  id: string;
  creatorProfileId: string;
  amountCents: number;
  currency: string;
  status: RealPayoutStatus;
  swichPayoutId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RealPayoutMethodValue = "bank_transfer" | "jazzcash" | "easypaisa";

export interface RealPayoutMethodState {
  payoutMethod: RealPayoutMethodValue | null;
  connected: boolean;
}

export interface UpdateRealPayoutMethodInput {
  method: RealPayoutMethodValue;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
  mobileWalletNumber?: string;
  mobileWalletAccountName?: string;
}

/**
 * Real dashboard aggregates (API-ENDPOINTS.md) — much coarser than the mock's OverviewStats/
 * OverviewTrends: no time series, no per-offer stats, no activity feed, no month-over-month
 * trend deltas. This is genuinely all either endpoint returns today — not a partial read, the
 * real v1 dashboard.
 */
export interface RealMerchantDashboard {
  offersTotal: number;
  offersLive: number;
  clicksTotal: number;
  salesAcceptedTotal: number;
  conversionRate: number;
  amountBilledCents: number;
}

export interface RealCreatorDashboard {
  linksTotal: number;
  clicksTotal: number;
  salesAttributedTotal: number;
  walletBalanceCents: number;
  lifetimePaidOutCents: number;
  hasPayoutThisPeriod: boolean;
}

export type PayoutRequestStatus = "processing" | "paid";

export interface PayoutRequest {
  id: string;
  amount: number;
  method: MerchantPayoutMethod["method"];
  status: PayoutRequestStatus;
  requestedAt: string;
  /** Set only when status flips to "paid" (lib/creator/store.ts's markPayoutRequestPaid) — real
   *  timestamp, not derived, so Playbook 07 G1's "time-to-payout trend" has real data to compute
   *  (paidAt − requestedAt) instead of a fabricated number. */
  paidAt?: string;
}

/** Generic dummy payout method — deliberately not wired to any real provider, per explicit
 *  instruction. Distinct from Playbook 02's onboarding PayoutData. */
export interface MerchantPayoutMethod {
  method: "bank" | "jazzcash" | "easypaisa";
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
  mobileWalletNumber?: string;
  mobileWalletAccountName?: string;
}

export interface MerchantRecord {
  offers: Offer[];
  applications: Application[];
  sales: Sale[];
  /** Playbook 05 E6's mock event log — absent (`undefined`) on records written before this field
   *  existed; every read goes through `record.events ?? []`, never assumes presence. */
  events?: OfferEvent[];
}

export interface OverviewStats {
  totalClicks: number;
  /** Sales / clicks, as a percent (0 if no clicks yet — not NaN/Infinity). */
  conversionRate: number;
  totalSales: number;
  /** Total commission owed to creators — the merchant's "spend" on this channel. */
  totalSpend: number;
  activeOffers: number;
  pendingApplications: number;
  /** Every application ever received, any status — the Overview "Applications" stat card's own
   *  number (pendingApplications stays a separate field for the callers that specifically want
   *  the unreviewed count). */
  totalApplications: number;
}
