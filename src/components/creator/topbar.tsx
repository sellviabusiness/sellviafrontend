"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, ChevronDown } from "lucide-react";
import { SellViaLogo } from "@/components/reference/brand/sellvia-logo";
import { ThemeToggle } from "@/components/reference/theme/theme-toggle";
import { NotificationBell } from "@/components/shared/notification-bell";
import { LogoutButton } from "@/app/dashboard/logout-button";
import { ROLE_PREFIX } from "@/lib/nav/config";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<string, string> = { merchant: "Merchant", creator: "Creator", admin: "Admin" };

/** Mirrors components/merchant/topbar.tsx exactly (Playbook 05 §4/§16) — same hamburger/role-
 *  dropdown/avatar+name+email shape, just pointed at /creator/* routes. */
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) setRoleMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const switchableRoles = roles.filter((r) => r === "merchant" || r === "creator");
  const hasMultipleRoles = switchableRoles.length > 1;
  const primaryRole = roles.includes("creator") ? "creator" : (roles[0] ?? "creator");
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

        <ThemeToggle />

        <div className="relative hidden sm:block" ref={roleMenuRef}>
          <button
            type="button"
            onClick={() => hasMultipleRoles && setRoleMenuOpen((v) => !v)}
            aria-haspopup={hasMultipleRoles ? "menu" : undefined}
            aria-expanded={hasMultipleRoles ? roleMenuOpen : undefined}
            className={cn(
              "flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground",
              hasMultipleRoles && "hover:border-border-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            )}
          >
            {ROLE_LABEL[primaryRole] ?? primaryRole}
            {hasMultipleRoles && <ChevronDown className="h-3 w-3" aria-hidden="true" />}
          </button>

          {hasMultipleRoles && roleMenuOpen && (
            <div role="menu" className="absolute right-0 top-9 z-10 w-36 space-y-0.5 rounded-[var(--radius-sm)] border border-border bg-card p-1.5">
              {switchableRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setRoleMenuOpen(false);
                    if (role !== "creator") router.push(ROLE_PREFIX[role as "merchant"]);
                  }}
                  className={cn(
                    "w-full rounded-[var(--radius-sm)] px-2.5 py-1.5 text-left text-sm hover:bg-foreground/5",
                    role === primaryRole ? "text-accent" : "text-foreground",
                  )}
                >
                  {ROLE_LABEL[role] ?? role}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
            className="flex items-center gap-2 rounded-full border border-transparent py-0.5 pl-0.5 pr-1 hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:pr-2.5"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-foreground/5 text-sm font-medium text-foreground">
              {initial}
            </span>
            <span className="hidden flex-col items-start leading-tight sm:flex">
              <span className="max-w-[140px] truncate text-sm font-medium text-foreground">{displayName}</span>
              <span className="max-w-[140px] truncate text-xs text-muted-foreground">{email}</span>
            </span>
          </button>

          {menuOpen && (
            <div role="menu" className="absolute right-0 top-11 z-10 w-56 space-y-3 rounded-[var(--radius-md)] border border-border bg-card p-3">
              <div className="sm:hidden">
                <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground" title={email}>{email}</p>
              </div>
              <Link
                href="/creator/settings"
                onClick={() => setMenuOpen(false)}
                className="block rounded-[var(--radius-sm)] px-2 py-1.5 text-sm text-foreground hover:bg-foreground/5"
              >
                Settings
              </Link>
              <Link
                href="/support"
                onClick={() => setMenuOpen(false)}
                className="block rounded-[var(--radius-sm)] px-2 py-1.5 text-sm text-foreground hover:bg-foreground/5"
              >
                Support
              </Link>
              <LogoutButton />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
