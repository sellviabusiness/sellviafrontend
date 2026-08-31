"use client";

import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { SellViaLogo } from "@/components/reference/brand/sellvia-logo";
import { ThemeToggle } from "@/components/reference/theme/theme-toggle";
import { LogoutButton } from "@/app/dashboard/logout-button";

/** Mirrors components/merchant/topbar.tsx's shape (hamburger, theme toggle, account menu) —
 *  no role dropdown (admin is exclusive, never dual-role with merchant/creator per
 *  lib/auth/role.ts's own SWITCHABLE_ROLES) and no notification bell (Playbook 06 F1 scoped
 *  notifications to Merchant/Creator only, admin was never a recipient). */
export function AdminTopbar({ email, onMenuClick }: { email: string; onMenuClick: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

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
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-foreground/5 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {initial}
          </button>
          {menuOpen && (
            <div role="menu" className="absolute right-0 top-11 z-10 w-56 space-y-3 rounded-[var(--radius-md)] border border-border bg-card p-3">
              <p className="truncate text-xs text-muted-foreground" title={email}>{email}</p>
              <LogoutButton />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
