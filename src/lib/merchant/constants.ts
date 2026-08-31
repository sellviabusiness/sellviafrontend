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

/** Flat platform-fee rate applied to every sale — see Sale.platformFee's doc comment in types.ts
 *  for why this is a flagged placeholder, not a confirmed number. */
export const PLATFORM_FEE_RATE = 0.05;

/** Canonical public tracking-link origin — see D4/D2's "auto-generated tracking link" requirement. */
export const TRACKING_LINK_ORIGIN = "https://sellvia.com/products";

/** Real, confirmed rule (Payments/Refund Handling, revised 2026-08-07 — Playbook 07 G5): a
 *  merchant can request at most this many billing credits per calendar month, across all their
 *  sales combined — not per sale. Replaces the earlier, incorrect "1 request per sale" cap this
 *  file originally shipped with (Playbook 04 D8). */
export const REFUND_CREDIT_MONTHLY_CAP = 5;
