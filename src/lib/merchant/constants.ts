/** Same list Playbook 02's Business onboarding step offers — kept in sync deliberately so a
 *  merchant sees one consistent category taxonomy across onboarding and offer creation. */
export const OFFER_CATEGORIES = [
  "Beauty",
  "Fashion",
  "Electronics",
  "Food & Beverage",
  "Health & Wellness",
  "Home & Lifestyle",
  "Digital Products",
  "Education",
  "Other",
];

export const MIN_COMMISSION = 10;
export const MAX_COMMISSION = 40;

/**
 * Real, confirmed rates (direct product decision, 2026-09-06) — replaces the earlier flat 5%
 * placeholder this file shipped with. Platform takes 1% from EACH side of a sale, not one 5% cut
 * from the merchant alone: 1% of the sale amount, billed to the merchant on top of the
 * commission they owe; 1% of the commission itself, deducted from what the creator is paid. No
 * minimum or maximum on the underlying sale/commission amount either side.
 */
export const MERCHANT_PLATFORM_FEE_RATE = 0.01;
export const CREATOR_PLATFORM_FEE_RATE = 0.01;

/** Canonical public tracking-link origin — see D4/D2's "auto-generated tracking link" requirement. */
export const TRACKING_LINK_ORIGIN = "https://sellvia.com/products";

/** Real, confirmed rule (Payments/Refund Handling, revised 2026-08-07 — Playbook 07 G5): a
 *  merchant can request at most this many billing credits per calendar month, across all their
 *  sales combined — not per sale. Replaces the earlier, incorrect "1 request per sale" cap this
 *  file originally shipped with (Playbook 04 D8). */
export const REFUND_CREDIT_MONTHLY_CAP = 5;
