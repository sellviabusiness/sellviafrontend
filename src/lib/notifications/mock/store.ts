import type { MockNotification, NotificationRole, NotificationType } from "./types";

/**
 * MOCK DATA LAYER — Notifications (per-role).
 *
 * Stands in for:
 *   GET  /notifications?role=merchant|creator  — getNotifications → MockNotification[]
 *   GET  /notifications/unread-count?role=…    — getUnreadCount → number
 *   POST /notifications/:id/read               — markNotificationRead
 *   POST /notifications/read-all?role=…         — markAllNotificationsRead
 *
 * Request/response shapes: `MockNotification` (./types.ts) is the intended response shape per
 * item. NOTE: an ALREADY-REAL, network-backed sibling system exists at lib/notifications/{types,
 * api,actions}.ts (calls a real, currently-unreachable `/notifications/summary` +
 * `/notifications/read-all`) — that one predates this mock and has no `type`/role split. At
 * handoff, reconcile the two into one contract (this file's role-split + typed icons, that
 * file's real endpoint calls) rather than keeping both.
 *
 * DEV-ONLY frontend state, same localStorage-per-account pattern as every other mock store in
 * this app. Keyed by RECIPIENT email, with merchant/creator notifications kept in two separate
 * arrays on the same record — never merged into one list, matching Playbook 06 §2's confirmed
 * "two separate scoped inboxes" rule (the same "never merge two roles into one menu" principle
 * nav config already established). A dual-role account has two real, independently-countable
 * unread counts, one per role.
 *
 * FLAGGED: this is local/mock, same class as every other honestly-mocked system in this app —
 * a real notification service (push, email digests, cross-device delivery) needs a real backend;
 * this only demonstrates the read/unread + click-through interaction with real (if locally
 * generated) data.
 */
const KEY = "sellvia_notifications";

interface NotificationRecord {
  merchant: MockNotification[];
  creator: MockNotification[];
}

function readAll(): Record<string, NotificationRecord> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, NotificationRecord>) : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, NotificationRecord>) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(all));
}

function emailKey(email: string) {
  return email.toLowerCase();
}

/** Normalized the same way as lib/merchant/store.ts / lib/creator/store.ts's own getRecord — see
 *  their doc comments for the real crash this class of bug caused (a record existing but missing
 *  an array field, only defaulting when the whole record was absent). */
function getRecord(email: string): NotificationRecord {
  const raw = readAll()[emailKey(email)];
  return { merchant: raw?.merchant ?? [], creator: raw?.creator ?? [] };
}

function saveRecord(email: string, record: NotificationRecord) {
  const all = readAll();
  all[emailKey(email)] = record;
  writeAll(all);
}

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

/**
 * The one write path every event-generation call site below goes through. Not exported —
 * callers use the typed helpers further down (notifyOfferPublished, notifyApplicationReceived,
 * etc.) so the actual event moments stay self-documenting at their call sites in
 * lib/merchant/store.ts / lib/creator/store.ts, rather than every caller building a raw
 * MockNotification by hand.
 */
function push(email: string, role: NotificationRole, type: NotificationType, title: string, href: string, body?: string) {
  const record = getRecord(email);
  const notification: MockNotification = { id: newId(), role, type, title, body, href, createdAt: new Date().toISOString(), readAt: null };
  record[role] = [notification, ...record[role]];
  saveRecord(email, record);
}

export function getNotifications(email: string, role: NotificationRole): MockNotification[] {
  return getRecord(email)[role];
}

export function getUnreadCount(email: string, role: NotificationRole): number {
  return getRecord(email)[role].filter((n) => n.readAt === null).length;
}

export function markNotificationRead(email: string, role: NotificationRole, id: string): void {
  const record = getRecord(email);
  record[role] = record[role].map((n) => (n.id === id && n.readAt === null ? { ...n, readAt: new Date().toISOString() } : n));
  saveRecord(email, record);
}

export function markAllNotificationsRead(email: string, role: NotificationRole): void {
  const record = getRecord(email);
  const now = new Date().toISOString();
  record[role] = record[role].map((n) => (n.readAt === null ? { ...n, readAt: now } : n));
  saveRecord(email, record);
}

// ---------------------------------------------------------------------------
// Typed generators — one per real event moment (Playbook 06 §7's confirmed set: application
// received/approved/rejected, payout completed, new sale, offer published). Called directly from
// the write paths in lib/merchant/store.ts and lib/creator/store.ts that already represent these
// moments, so a notification is never a second, separately-triggered thing that can drift out of
// sync with the real action it's describing.
// ---------------------------------------------------------------------------

export function notifyOfferPublished(merchantEmail: string, offerId: string, productName: string) {
  push(merchantEmail, "merchant", "offer_published", `"${productName}" is live`, `/merchant/offers/${offerId}`);
}

export function notifyApplicationReceived(merchantEmail: string, offerId: string, applicationId: string, creatorName: string, productName: string) {
  push(merchantEmail, "merchant", "application_received", `${creatorName} applied to "${productName}"`, `/merchant/applications/${applicationId}`, "New creator application");
}

export function notifyApplicationApproved(creatorEmail: string, applicationId: string, productName: string) {
  push(creatorEmail, "creator", "application_approved", `You're approved for "${productName}"`, `/creator/my-links/${applicationId}`, "Your tracking link is ready.");
}

export function notifyApplicationRejected(creatorEmail: string, productName: string) {
  push(creatorEmail, "creator", "application_rejected", `Your application to "${productName}" wasn't approved`, "/creator/applications");
}

export function notifySale(merchantEmail: string, saleId: string, productName: string, creatorEmail: string | undefined, applicationId: string) {
  push(merchantEmail, "merchant", "sale", `New sale on "${productName}"`, `/merchant/sales/${saleId}`);
  if (creatorEmail) {
    push(creatorEmail, "creator", "sale", `You earned commission from "${productName}"`, `/creator/my-links/${applicationId}`);
  }
}

export function notifyPayoutCompleted(creatorEmail: string, amount: number) {
  push(creatorEmail, "creator", "payout_completed", `Payout of ${amount} completed`, "/creator/earnings");
}
