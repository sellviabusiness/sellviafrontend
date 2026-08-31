// Unverified against Notification Logic doc (unreachable: private submodule,
// no bypass secret). Shape is a placeholder — isolated to this file and
// api.ts so swapping in the real one is small once that doc's readable.
export interface Notification {
  id: string
  title: string
  body?: string
  createdAt: string
  readAt: string | null
  href?: string
}

export interface NotificationSummary {
  unreadCount: number
  items: Notification[]
}
