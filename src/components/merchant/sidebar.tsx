"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Megaphone, ClipboardList, Receipt, CreditCard, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Playbook 04 §2a's rail, renamed Campaigns -> Offers + Billing added — Settings/Notifications
 * stay reachable from the topbar account menu, not this rail.
 *
 * "Payouts" removed (this session's audit, prompted by the A1-A4 build): it was never in the
 * original D1-D12 list, its route was a permanent "content pending" placeholder, and the data
 * layer behind it (requestPayout/getPayoutRequests, merchant-side) was dead code nothing ever
 * wrote to — see lib/merchant/store.ts's header comment for the full reasoning. It was not a
 * duplicate of Billing (Billing = what the merchant owes SellVia; this would have been the
 * reverse direction), but the real architecture (Money Flow doc, 2026-08-07) has SellVia bill
 * the merchant and pay CREATORS from its own collected funds — SellVia never owes the merchant a
 * payout, so there's no real feature here to build. Flagged to the user rather than silently
 * removed without explanation.
 */
const NAV_ITEMS = [
  { href: "/merchant/overview", label: "Overview", icon: LayoutGrid },
  { href: "/merchant/offers", label: "Offers", icon: Megaphone },
  { href: "/merchant/applications", label: "Applications", icon: ClipboardList },
  { href: "/merchant/sales", label: "Sales", icon: Receipt },
  { href: "/merchant/billing", label: "Billing", icon: CreditCard },
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
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
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

/** Desktop rail — unchanged shape/routes, `sm`+ only. */
export function MerchantSidebar() {
  return (
    <nav aria-label="Merchant navigation" className="hidden w-56 shrink-0 flex-col gap-1 border-r border-border p-4 sm:flex">
      <NavLinks />
    </nav>
  );
}

/**
 * Mobile nav drawer — same NAV_ITEMS/routes as the desktop rail, triggered by the topbar's
 * hamburger button (state lifted to MerchantAppShell). Below `sm` only; a no-op above it since
 * the desktop rail is already visible there.
 *
 * BUG FIX: was `if (!open) return null` — unmounted the whole subtree (including NavLinks/
 * usePathname) while closed, so opening it was a fresh mount every time, not a toggle. Reported
 * symptom: first open shows blank content, a second click is needed before menu items appear.
 * Always mounted now; `open` only toggles CSS (opacity/pointer-events), so there's no first-mount
 * render race — the content exists in the DOM before the drawer is ever opened.
 */
export function MerchantMobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
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
        aria-label="Merchant navigation"
        className={cn(
          "absolute left-0 top-0 flex h-full w-64 flex-col gap-1 border-r border-border bg-background p-4 transition-transform",
          open ? "translate-x-0" : "-translate-x-4",
        )}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground-2">Menu</span>
          <button
            type="button"
            onClick={onClose}
            tabIndex={open ? 0 : -1}
            aria-label="Close navigation menu"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-foreground hover:bg-foreground/5"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <NavLinks onNavigate={onClose} />
      </nav>
    </div>
  );
}
