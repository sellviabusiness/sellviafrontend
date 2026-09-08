"use client";

import { Menu } from "lucide-react";
import { SellViaLogo } from "@/components/reference/brand/sellvia-logo";
import { ThemeToggle } from "@/components/reference/theme/theme-toggle";
import { LogoutButton } from "@/app/dashboard/logout-button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/** Mirrors components/merchant/topbar.tsx's shape (hamburger, theme toggle, account menu) —
 *  no role dropdown (admin is exclusive, never dual-role with merchant/creator per
 *  lib/auth/role.ts's own SWITCHABLE_ROLES) and no notification bell (Playbook 06 F1 scoped
 *  notifications to Merchant/Creator only, admin was never a recipient). */
export function AdminTopbar({ email, onMenuClick }: { email: string; onMenuClick: () => void }) {
  const initial = email.charAt(0).toUpperCase();

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

      <SellViaLogo href="/admin/dashboard" height={24} />
      <span className="hidden rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground sm:inline">Admin</span>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-foreground/5 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
                <p className="truncate text-sm font-semibold text-foreground">Admin</p>
                <p className="truncate text-xs text-muted-foreground" title={email}>{email}</p>
              </div>
            </div>

            <DropdownMenuSeparator />
            <LogoutButton variant="ghost" className="w-full justify-start gap-2 rounded-md px-2 py-2 text-sm font-normal text-danger hover:bg-danger-bg" />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
