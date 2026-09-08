// Confirmed real shape — API-ENDPOINTS.md, 2026-09-05 snapshot, GET /api/v1/notifications.
// Every notification is both an in-app row (this) and an email attempt in parallel; `title`/
// `body` are already server-composed, display-ready copy — not raw data to build a sentence
// from client-side, the way the old mock notification generators did.
export interface Notification {
  id: string
  /** A real string, but the exact enum values aren't confirmed anywhere in the contract —
   *  treated as an opaque category for icon/href mapping, not matched exactly. */
  notificationType: string
  title: string
  body?: string
  stream: "transactional" | "marketing"
  status: "pending" | "sent" | "failed"
  readAt: string | null
  sentAt: string | null
  createdAt: string
}
