"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, ArrowLeftRight, LifeBuoy } from "lucide-react";
import { SellViaLogo } from "@/components/reference/brand/sellvia-logo";
import { NotificationBell } from "@/components/shared/notification-bell";
import { LogoutButton } from "@/app/dashboard/logout-button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ROLE_PREFIX } from "@/lib/nav/config";

const ROLE_LABEL: Record<string, string> = { merchant: "Merchant", creator: "Creator", admin: "Admin" };

/** Mirrors components/merchant/topbar.tsx exactly (Playbook 05 §4/§16) — same hamburger/account
 *  menu shape, just pointed at /creator/* routes. Theme toggle moved into Settings; no standalone
 *  role badge — see merchant/topbar.tsx's doc comment for why. */
export function CreatorTopbar({
  email,
  fullName,
  roles,
  onMenuClick,
}: {
  email: string;
  fullName?: string;
  roles: string[];
  onMenuClick: () => void;
}) {
  const router = useRouter();

  const switchableRoles = roles.filter((r) => r === "merchant" || r === "creator");
  const primaryRole = roles.includes("creator") ? "creator" : (roles[0] ?? "creator");
  const otherRoles = switchableRoles.filter((r) => r !== primaryRole);
  const displayName = fullName?.trim() || email.split("@")[0];
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-foreground hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <SellViaLogo href="/creator/overview" height={24} />

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <NotificationBell email={email} role="creator" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-foreground/5 text-sm font-medium text-foreground hover:border-border-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {initial}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 p-2">
            <div className="flex items-center gap-3 p-2">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-foreground/5 text-base font-medium text-foreground">
                {initial}
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground" title={email}>{email}</p>
              </div>
            </div>

            {otherRoles.length > 0 && (
              <>
                <DropdownMenuSeparator />
                {otherRoles.map((role) => (
                  <DropdownMenuItem key={role} onSelect={() => router.push(ROLE_PREFIX[role as "merchant"])}>
                    <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                    Switch to {ROLE_LABEL[role] ?? role}
                  </DropdownMenuItem>
                ))}
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/support">
                <LifeBuoy className="h-4 w-4" aria-hidden="true" />
                Support
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <LogoutButton variant="ghost" className="w-full justify-start gap-2 rounded-md px-2 py-2 text-sm font-normal text-danger hover:bg-danger-bg" />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
