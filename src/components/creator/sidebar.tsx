"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Compass, ClipboardList, Link2, Wallet, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Playbook 05 §16's rail — same shape as components/merchant/sidebar.tsx (Playbook 04), rebuilt
 *  for Creator per §4's approved recommendation so a dual-role account sees one consistent
 *  design, not two. Settings stays in the topbar account menu, matching Merchant's convention. */
const NAV_ITEMS = [
  { href: "/creator/overview", label: "Overview", icon: LayoutGrid },
  { href: "/creator/discover", label: "Discover", icon: Compass },
  { href: "/creator/applications", label: "Applications", icon: ClipboardList },
  { href: "/creator/my-links", label: "My Links", icon: Link2 },
  { href: "/creator/earnings", label: "Earnings", icon: Wallet },
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

export function CreatorSidebar() {
  return (
    <nav aria-label="Creator navigation" className="hidden w-56 shrink-0 flex-col gap-1 border-r border-border p-4 sm:flex">
      <NavLinks />
    </nav>
  );
}

/**
 * Mobile nav drawer — same pattern as components/merchant/sidebar.tsx's MerchantMobileNav.
 *
 * BUG FIX: was `if (!open) return null` — see MerchantMobileNav's own doc comment for the exact
 * mechanism this caused (blank content on first open, needing a second click). Same always-
 * mounted + CSS-visibility fix applied here.
 */
export function CreatorMobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
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
        aria-label="Creator navigation"
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
