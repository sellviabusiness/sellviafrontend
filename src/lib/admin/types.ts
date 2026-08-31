/**
 * Playbook 07 — Admin Panel domain types. Every G-item's data shape lives here, one file, same
 * "types file separate from store file" split every other domain in this app already uses
 * (lib/merchant/types.ts + store.ts, lib/onboarding/types.ts + store.ts).
 */

// ---------------------------------------------------------------------------
// G2 — Moderation
// ---------------------------------------------------------------------------

/** Security/Fraud Prevention's real rule set, plus the 2026-08-07 merchant under-reporting
 *  addition. Thresholds for each are explicitly undefined in the source docs (Playbook 07 §6.2/
 *  §6.3) — not invented here; see lib/admin/store.ts's own flagged-threshold constants. */
export type FlagRule =
  | "velocity"
  | "self_referral"
  | "conversion_outlier"
  | "device_fingerprint"
  | "merchant_underreporting";

export type FlagEntityType = "sale" | "application" | "offer" | "account";
export type FlagStatus = "unreviewed" | "cleared" | "actioned";

export interface ModerationFlag {
  id: string;
  rule: FlagRule;
  entityType: FlagEntityType;
  entityId: string;
  /** Human-readable summary of the flagged thing — avoids every list/detail screen needing to
   *  re-resolve the entity from four different stores just to render a row. */
  entityLabel: string;
  /** The account this flag concerns (merchant or creator email) — who a "suspend"/"reverse"
   *  action would actually apply to. */
  ownerEmail: string;
  status: FlagStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewNote?: string;
}

// ---------------------------------------------------------------------------
// G3 — Offer vetting
// ---------------------------------------------------------------------------

export type VettingReason = "high_commission" | "high_risk";
export type VettingStatus = "pending" | "approved" | "rejected";

export interface VettingItem {
  id: string;
  offerId: string;
  merchantEmail: string;
  reason: VettingReason;
  status: VettingStatus;
  createdAt: string;
  decidedAt?: string;
}

// ---------------------------------------------------------------------------
// G4 — User management (suspension state layered onto existing Auth/Onboarding/Merchant/
// Creator accounts, not a duplicate user record)
// ---------------------------------------------------------------------------

export interface UserSuspension {
  email: string;
  suspended: boolean;
  suspendedAt?: string;
  reason?: string;
}

/** G4's `get_ticket_context`-style aggregated view — one shape covering everything a support
 *  responder needs across Sales/Applications/Payouts, per Operations/Live Production Access. */
export interface TicketContext {
  email: string;
  roles: string[];
  suspended: boolean;
  offerCount: number;
  applicationCount: number;
  saleCount: number;
  pendingPayoutAmount: number;
}

// ---------------------------------------------------------------------------
// G5 — Refunds (reuses lib/merchant/types.ts's Sale.refundCreditStatus directly — no separate
// type needed) and Chargebacks (a genuinely new entity, doesn't exist anywhere yet)
// ---------------------------------------------------------------------------

export type ChargebackStatus = "open" | "evidence_submitted" | "won" | "lost";

export interface Chargeback {
  id: string;
  saleId: string;
  merchantEmail: string;
  amount: number;
  status: ChargebackStatus;
  /** Evidence text submitted within Switch's dispute window — Payments/Chargebacks leaves
   *  "who submits evidence" genuinely unresolved (Playbook 07 §6.5); modeled here as
   *  Admin-submittable on the merchant's behalf, the safer default until that's confirmed. */
  evidence?: string;
  createdAt: string;
  resolvedAt?: string;
}

// ---------------------------------------------------------------------------
// G6 — Reconciliation
// ---------------------------------------------------------------------------

export type ReconciliationMismatchKind = "missing_switch_charge" | "missing_internal_sale" | "amount_mismatch";
export type ReconciliationStatus = "open" | "resolved";

export interface ReconciliationMismatch {
  id: string;
  saleId: string;
  kind: ReconciliationMismatchKind;
  detail: string;
  status: ReconciliationStatus;
  detectedAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
}

// ---------------------------------------------------------------------------
// G9 — Founder AI Command Console — audit log shared by every G-item's actions, not just the
// console's (Operations/Founder AI Command Console: one log, tagged by origin, not a separate one)
// ---------------------------------------------------------------------------

export type AuditActionSource = "dashboard" | "ai_console" | "api";

export interface AdminAuditEntry {
  id: string;
  /** Machine-stable action name, matches the console tool name where applicable (e.g.
   *  "suspend_user") so a dashboard click and a console command produce identically-shaped log
   *  rows for the same real action. */
  action: string;
  targetType: string;
  targetId: string;
  actorEmail: string;
  initiatedVia: AuditActionSource;
  detail?: string;
  at: string;
}

// ---------------------------------------------------------------------------
// G10 — Analytics (P&L, Unit Economics, AI/Token costs)
// ---------------------------------------------------------------------------

export interface MonthlyPnl {
  /** "2026-08" */
  month: string;
  platformFeeRevenue: number;
  switchProcessingFees: number;
  hostingCosts: number;
  aiCosts: number;
  otherSaasCosts: number;
  /** Analytics/Automated Monthly P&L's own recommendation: finalized months are locked, later
   *  corrections are separate adjustment entries, never an in-place edit. */
  finalized: boolean;
  generatedAt: string;
}

/** One manual-entry cost line for a source with no billing API (Clerk, monitoring, etc.) —
 *  the doc's own "manual monthly entry" fallback, not full automation pretending to exist. */
export interface ManualCostEntry {
  id: string;
  month: string;
  label: string;
  amount: number;
  enteredAt: string;
}

export type AiUsageFeature = "matching" | "screening" | "copy_assist";

export interface AiUsageEvent {
  id: string;
  feature: AiUsageFeature;
  tokensIn: number;
  tokensOut: number;
  costCents: number;
  relatedUserId?: string;
  relatedEntityType?: string;
  createdAt: string;
}
