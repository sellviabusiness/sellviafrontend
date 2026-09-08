"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Compass, ClipboardList, Wallet, Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";

const SETTINGS_HREF = "/creator/settings";

/**
 * Playbook 05 §16's rail — same shape as components/merchant/sidebar.tsx (Playbook 04), rebuilt
 * for Creator per §4's approved recommendation so a dual-role account sees one consistent
 * design, not two. Settings moved here (bottom-pinned, own item below) from the topbar account
 * menu, mirroring Merchant's own move.
 *
 * REMOVED — My Links (2026-09-06 product decision): a separate page for "your tracking links"
 * never had much to show beyond the same approved applications already listed here — folded the
 * link itself into this Applications table instead (click an approved row to reveal it), one
 * screen instead of two. See applications-view.tsx / real-applications-view.tsx.
 */
const NAV_ITEMS = [
  { href: "/creator/overview", label: "Overview", icon: LayoutGrid },
  { href: "/creator/discover", label: "Discover", icon: Compass },
  { href: "/creator/applications", label: "Applications", icon: ClipboardList },
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

/** Bottom-pinned Settings entry, labeled variant — used by the mobile drawer, appended after the
 *  regular nav list with `mt-auto` pushing it to the bottom of the drawer. */
function SettingsNavLink({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = pathname === SETTINGS_HREF || pathname.startsWith(`${SETTINGS_HREF}/`);
  return (
    <Link
      href={SETTINGS_HREF}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "mt-auto flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
      )}
    >
      <Settings className="h-4 w-4" aria-hidden="true" />
      Settings
    </Link>
  );
}

/** Icon-only rail (Pinterest-style) — each item is a centered icon in a rounded square, with its
 *  label as a floating tooltip that only appears on hover/focus (`group`/`group-hover`, no JS or
 *  extra dependency needed). The labeled list stays in the mobile drawer (NavLinks, unchanged) —
 *  this is the desktop rail's own rendering. */
function RailLinks() {
  const pathname = usePathname();
  return (
    <>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] transition-colors",
              active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-foreground/10 hover:text-foreground",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">{label}</span>
            <span
              role="tooltip"
              className="pointer-events-none absolute left-full z-20 ml-2 whitespace-nowrap rounded-[var(--radius-sm)] bg-foreground px-2.5 py-1.5 text-xs font-medium text-background opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              {label}
            </span>
          </Link>
        );
      })}
    </>
  );
}

/** Bottom-pinned Settings entry, icon-only variant — same tooltip treatment as RailLinks' items. */
function SettingsRailLink() {
  const pathname = usePathname();
  const active = pathname === SETTINGS_HREF || pathname.startsWith(`${SETTINGS_HREF}/`);
  return (
    <Link
      href={SETTINGS_HREF}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative mt-auto flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] transition-colors",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-foreground/10 hover:text-foreground",
      )}
    >
      <Settings className="h-5 w-5" aria-hidden="true" />
      <span className="sr-only">Settings</span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-full z-20 ml-2 whitespace-nowrap rounded-[var(--radius-sm)] bg-foreground px-2.5 py-1.5 text-xs font-medium text-background opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        Settings
      </span>
    </Link>
  );
}

/** Desktop rail — icon-only (Pinterest-style), `sm`+ only. */
export function CreatorSidebar() {
  return (
    <nav aria-label="Creator navigation" className="hidden w-16 shrink-0 flex-col items-center gap-1 border-r border-border py-4 sm:flex">
      <RailLinks />
      <SettingsRailLink />
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
        <SettingsNavLink onNavigate={onClose} />
      </nav>
    </div>
  );
}
