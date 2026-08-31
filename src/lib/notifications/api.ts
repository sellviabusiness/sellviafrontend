import { apiRequest } from "@/lib/api"
import type { NotificationSummary } from "./types"

// Endpoint paths are placeholders — unverified against Notification Logic /
// API-CONTRACT-SHEET (both unreachable). Session-scoped implicitly (same
// pattern as every other apiRequest call: no user/role param, the backend
// reads it off the request) so this stays role-agnostic — one bell, shared
// across Merchant/Creator/Admin shells, per the task.
export async function getNotificationSummary(): Promise<NotificationSummary> {
  return apiRequest<NotificationSummary>("/notifications/summary")
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiRequest<void>("/notifications/read-all", { method: "POST" })
}
