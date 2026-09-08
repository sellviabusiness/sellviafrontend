import { apiRequest } from "@/lib/api"
import type { Notification } from "./types"

// Real endpoints, confirmed — API-ENDPOINTS.md, 2026-09-05 snapshot. Previously pointed at
// placeholder paths (/notifications/summary, /notifications/read-all with a client-side loop)
// that never existed; corrected to match what actually shipped.
export async function getNotifications(): Promise<Notification[]> {
  return apiRequest<Notification[]>("/notifications")
}

export async function markNotificationRead(id: string): Promise<Notification> {
  return apiRequest<Notification>(`/notifications/${id}/read`, { method: "POST" })
}

/** Real bulk endpoint, added 2026-09-05 specifically because the per-id-only route was flagged
 *  missing — one `UPDATE ... WHERE read_at IS NULL` server-side, not a client-side loop. */
export async function markAllNotificationsRead(): Promise<{ markedCount: number }> {
  return apiRequest<{ markedCount: number }>("/notifications/read-all", { method: "POST" })
}
