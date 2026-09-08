"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Megaphone, ClipboardList, ShoppingBag, Wallet } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { isMockMode } from "@/lib/auth/config";
import {
  getNotifications as getMockNotifications,
  getUnreadCount as getMockUnreadCount,
  markNotificationRead as markMockNotificationRead,
  markAllNotificationsRead as markAllMockNotificationsRead,
} from "@/lib/notifications/mock/store";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/notifications/api";
import type { MockNotification, NotificationRole, NotificationType } from "@/lib/notifications/mock/types";
import type { Notification } from "@/lib/notifications/types";
import { formatRelativeTime } from "@/lib/merchant/format";

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  offer_published: Megaphone,
  application_received: ClipboardList,
  application_approved: ClipboardList,
  application_rejected: ClipboardList,
  sale: ShoppingBag,
  payout_completed: Wallet,
};

/**
 * Real notificationType values aren't confirmed anywhere in the contract (API-ENDPOINTS.md
 * documents the field as a plain string, no enum) — this buckets by substring rather than exact
 * match, on purpose, so an unrecognized-but-plausible type still gets a reasonable icon/href
 * instead of silently falling through. Never invents a route for an unmatched type: falls back
 * to the role's own overview page, which always exists, rather than a guessed dead link.
 */
function resolveRealNotification(type: string, role: NotificationRole): { Icon: typeof Bell; href: string } {
  const t = type.toLowerCase();
  if (t.includes("application")) return { Icon: ClipboardList, href: role === "merchant" ? "/merchant/applications" : "/creator/applications" };
  if (t.includes("sale")) return { Icon: ShoppingBag, href: "/merchant/sales" };
  if (t.includes("payout")) return { Icon: Wallet, href: "/creator/earnings" };
  if (t.includes("offer")) return { Icon: Megaphone, href: "/merchant/offers" };
  return { Icon: Bell, href: role === "merchant" ? "/merchant/overview" : "/creator/overview" };
}

/**
 * Playbook 06 F1 — real, per-role, markable-read notification bell, shared by both
 * MerchantTopbar and CreatorTopbar. Mock mode keeps its own local/per-role store unchanged (see
 * lib/notifications/mock/store.ts's doc comment on why merchant/creator are two separate
 * inboxes) — Clerk mode now reads the real backend (lib/notifications/api.ts), which has no
 * role split at all: an account is Merchant XOR Creator, so "your notifications" already means
 * exactly one inbox with no filtering needed.
 */
export function NotificationBell({ email, role }: { email: string; role: NotificationRole }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mockItems, setMockItems] = useState<MockNotification[]>([]);
  const [realItems, setRealItems] = useState<Notification[]>([]);
  const [loadError, setLoadError] = useState(false);

  async function refresh() {
    if (isMockMode) {
      setMockItems(getMockNotifications(email, role));
      return;
    }
    try {
      const items = await getNotifications();
      setRealItems(items);
      setLoadError(false);
    } catch {
      // Silent — a broken bell shouldn't block the rest of the shell from rendering. Shows
      // "You're all caught up" (empty state) rather than an error banner in the topbar.
      setLoadError(true);
    }
  }

  useEffect(() => {
    // localStorage is only readable client-side (mock branch) and the real branch is a network
    // call — both have to run from an effect, not derived during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally runs once per email/role
  }, [email, role]);

  const unread = isMockMode ? getMockUnreadCount(email, role) : realItems.filter((n) => n.readAt === null).length;

  async function handleMockClick(id: string) {
    markMockNotificationRead(email, role, id);
    refresh();
    setOpen(false);
  }

  async function handleRealClick(id: string) {
    setOpen(false);
    try {
      await markNotificationRead(id);
    } catch {
      // Navigation proceeds regardless — a failed read-marking shouldn't trap the user in place.
    }
    refresh();
  }

  async function handleMarkAllRead() {
    if (isMockMode) {
      markAllMockNotificationsRead(email, role);
      refresh();
      return;
    }
    try {
      await markAllNotificationsRead();
    } catch {
      // Best-effort — the list still refreshes below either way.
    }
    refresh();
  }

  const empty = isMockMode ? mockItems.length === 0 : realItems.length === 0 || loadError;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-border text-foreground hover:border-border-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unread > 0 && <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 space-y-1 p-2">
        <div className="flex items-center justify-between px-1.5 py-1">
          <span className="text-sm font-medium text-foreground">Notifications</span>
          {unread > 0 && (
            <button type="button" onClick={handleMarkAllRead} className="text-xs text-muted-foreground hover:text-foreground">
              Mark all read
            </button>
          )}
        </div>
        {empty ? (
          <p className="px-1.5 py-4 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
        ) : (
          <div className="max-h-80 space-y-0.5 overflow-y-auto">
            {isMockMode
              ? mockItems.map((item) => {
                  const Icon = TYPE_ICON[item.type];
                  const unreadItem = item.readAt === null;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => handleMockClick(item.id)}
                      className={cn(
                        "flex items-start gap-2.5 rounded-[var(--radius-sm)] px-2 py-2 text-sm hover:bg-foreground/5",
                        unreadItem ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full", unreadItem ? "bg-accent/10 text-accent-foreground" : "bg-foreground/5 text-muted-foreground-2")}>
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{item.title}</span>
                        <span className="block text-xs text-muted-foreground-2">{formatRelativeTime(item.createdAt)}</span>
                      </span>
                      {unreadItem && <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                    </Link>
                  );
                })
              : realItems.map((item) => {
                  const { Icon, href } = resolveRealNotification(item.notificationType, role);
                  const unreadItem = item.readAt === null;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        handleRealClick(item.id);
                        router.push(href);
                      }}
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-[var(--radius-sm)] px-2 py-2 text-left text-sm hover:bg-foreground/5",
                        unreadItem ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full", unreadItem ? "bg-accent/10 text-accent-foreground" : "bg-foreground/5 text-muted-foreground-2")}>
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{item.title}</span>
                        {item.body && <span className="block truncate text-xs text-muted-foreground-2">{item.body}</span>}
                        <span className="block text-xs text-muted-foreground-2">{formatRelativeTime(item.createdAt)}</span>
                      </span>
                      {unreadItem && <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                    </button>
                  );
                })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
