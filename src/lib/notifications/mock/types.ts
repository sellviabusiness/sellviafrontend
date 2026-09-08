/**
 * Playbook 06 F1 — a real, local, markable-read mock notification store, parallel to (not a
 * replacement for) the pre-existing network-backed `lib/notifications/types.ts`/`api.ts` — same
 * "mock/kratos" split pattern already used for auth (`lib/auth/mock/*` vs `lib/auth/kratos/*`).
 * That real system stays exactly as it was, unused by Merchant/Creator's shells until a real
 * backend exists; this mock one is what those two shells' bells actually read from now.
 */
export type NotificationType =
  | "application_received"
  | "application_approved"
  | "application_rejected"
  | "sale"
  | "payout_completed"
  | "offer_published";

export type NotificationRole = "merchant" | "creator";

export interface MockNotification {
  id: string;
  role: NotificationRole;
  type: NotificationType;
  title: string;
  body?: string;
  href: string;
  createdAt: string;
  readAt: string | null;
}
