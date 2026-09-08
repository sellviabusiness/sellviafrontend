/**
 * Admin Panel constants — confirmed real ones vs. flagged placeholders kept clearly separate,
 * per Playbook 07 §6 (do not invent thresholds the source docs themselves leave open).
 */

// --- Confirmed real (founder-confirmed in the source docs, not guessed) -----------------------

/** Analytics/Activation, Aha Moment & Churn Signals — the two real nudge/at-risk tiers. */
export const CHURN_NUDGE_HOURS = 24;
export const CHURN_AT_RISK_HOURS = 48;

/** Payments/Chargebacks, 2026-08-07: lifetime (not periodic) grace count before the merchant
 *  starts paying the Switch dispute fee themselves. */
export const CHARGEBACK_FREE_LIFETIME_COUNT = 5;

// --- Flagged placeholders (genuinely undefined in every doc read — Playbook 07 §6.2/§6.3) ------

/**
 * G2/G3 — Fraud Prevention's and Admin Panel's own Open Questions sections both say exact
 * thresholds are not yet defined ("reasonable to start conservative and tune based on real early
 * data"). These numbers are NOT real product decisions — they exist only so the moderation/
 * vetting queues have something concrete to scan against and demonstrate the real workflow
 * (flag → review → clear/act) end to end. Surfaced in the UI as "(placeholder threshold)", never
 * presented as a confirmed rule. Change freely; there's no real number to preserve.
 */
export const FLAGGED_VELOCITY_CLICKS_PER_HOUR = 20;
export const FLAGGED_CONVERSION_OUTLIER_MULTIPLIER = 3; // vs. the offer's own average conversion rate
export const FLAGGED_HIGH_COMMISSION_THRESHOLD = 35; // % — MAX_COMMISSION is 40, so this is "near the ceiling," not a real risk cut-off
