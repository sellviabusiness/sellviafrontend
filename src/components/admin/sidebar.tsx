"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  ShieldAlert,
  ClipboardCheck,
  Users,
  Receipt,
  Scale,
  AlertTriangle,
  Terminal,
  BarChart3,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Playbook 07's G1–G10 rail — one entry per screen, "fully separate nav" from Merchant/Creator
 * per SCREEN_INVENTORY's own global note for the whole Admin section.
 *
 * G7 (Waitlist) removed — Playbook 08 removed the public marketing site entirely (no public
 * waitlist form exists anymore to feed it, so there's nothing left to manage here).
 */
const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/admin/moderation", label: "Moderation", icon: ShieldAlert },
  { href: "/admin/offers/vetting", label: "Offer vetting", icon: ClipboardCheck },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/refunds-disputes", label: "Refunds & disputes", icon: Receipt },
  { href: "/admin/reconciliation", label: "Reconciliation", icon: Scale },
  { href: "/admin/at-risk-users", label: "At-risk users", icon: AlertTriangle },
  { href: "/admin/console", label: "AI Console", icon: Terminal },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </>
  );
}

export function AdminSidebar() {
  return (
    <nav aria-label="Admin navigation" className="hidden w-56 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border p-4 sm:flex">
      <NavLinks />
    </nav>
  );
}

/** Same always-mounted + CSS-visibility fix as MerchantMobileNav/CreatorMobileNav (see their doc
 *  comments) — was `if (!open) return null`, which caused a blank-on-first-open bug. */
export function AdminMobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-40 sm:hidden transition-opacity",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
      aria-hidden={!open}
    >
      <div onClick={onClose} className="absolute inset-0 bg-background/80" />
      <nav
        aria-label="Admin navigation"
        className={cn(
          "absolute left-0 top-0 flex h-full w-64 flex-col gap-1 overflow-y-auto border-r border-border bg-background p-4 transition-transform",
          open ? "translate-x-0" : "-translate-x-4",
        )}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground-2">Menu</span>
          <button type="button" onClick={onClose} tabIndex={open ? 0 : -1} aria-label="Close navigation menu" className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-foreground hover:bg-foreground/5">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <NavLinks onNavigate={onClose} />
      </nav>
    </div>
  );
}
