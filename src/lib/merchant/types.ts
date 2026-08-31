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
  commissionAmount: number;
  /**
   * SellVia's own cut, distinct from the creator's commission — unverified against Commission
   * Engine (unreachable), modeled as a flat 5% of `amount` so the receipt has somewhere real to
   * show a platform fee line rather than omitting it; swap for the real formula once confirmed.
   */
  platformFee: number;
  merchantAmount: number;
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
