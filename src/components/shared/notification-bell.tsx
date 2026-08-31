"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Megaphone, ClipboardList, UserCheck, XCircle, ShoppingBag, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/notifications/mock/store";
import type { MockNotification, NotificationRole, NotificationType } from "@/lib/notifications/mock/types";
import { formatRelativeTime } from "@/lib/merchant/format";

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  offer_published: Megaphone,
  application_received: ClipboardList,
  application_approved: UserCheck,
  application_rejected: XCircle,
  sale: ShoppingBag,
  payout_completed: Wallet,
};

/**
 * Playbook 06 F1 — real, per-role, markable-read notification bell, shared by both
 * MerchantTopbar and CreatorTopbar (parameterized by `role`, never merged — see
 * lib/notifications/mock/store.ts's own doc comment for why). Replaces the disabled "not yet
 * available" placeholder bell button both shells had. Local/mock data — see that same file's
 * flagged real-backend-later note.
 */
export function NotificationBell({ email, role }: { email: string; role: NotificationRole }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MockNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  function refresh() {
    setItems(getNotifications(email, role));
    setUnread(getUnreadCount(email, role));
  }

  useEffect(() => {
    // localStorage is client-only — can't read during the server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, role]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleOpen() {
    setOpen((v) => !v);
  }

  function handleItemClick(id: string) {
    markNotificationRead(email, role, id);
    refresh();
    setOpen(false);
  }

  function handleMarkAllRead() {
    markAllNotificationsRead(email, role);
    refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={handleOpen}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-border text-foreground hover:border-border-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unread > 0 && <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />}
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-11 z-10 w-80 space-y-1 rounded-[var(--radius-md)] border border-border bg-card p-2">
          <div className="flex items-center justify-between px-1.5 py-1">
            <span className="text-sm font-medium text-foreground">Notifications</span>
            {unread > 0 && (
              <button type="button" onClick={handleMarkAllRead} className="text-xs text-muted-foreground hover:text-foreground">
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-1.5 py-4 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
          ) : (
            <div className="max-h-80 space-y-0.5 overflow-y-auto">
              {items.map((item) => {
                const Icon = TYPE_ICON[item.type];
                const unreadItem = item.readAt === null;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => handleItemClick(item.id)}
                    className={cn(
                      "flex items-start gap-2.5 rounded-[var(--radius-sm)] px-2 py-2 text-sm hover:bg-foreground/5",
                      unreadItem ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full", unreadItem ? "bg-accent/10 text-accent" : "bg-foreground/5 text-muted-foreground-2")}>
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{item.title}</span>
                      <span className="block text-xs text-muted-foreground-2">{formatRelativeTime(item.createdAt)}</span>
                    </span>
                    {unreadItem && <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
