"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { Button, type ButtonProps } from "@/components/reference/ui/button";
import { authProvider } from "@/lib/auth/provider";
import { isMockMode } from "@/lib/auth/config";

type LogoutButtonProps = { className?: string; variant?: ButtonProps["variant"] };

/**
 * Split into two components rather than one that calls both `authProvider` and `useClerk()`
 * unconditionally: useClerk() throws outside a <ClerkProvider> (see app/layout.tsx — that's only
 * ever mounted in clerk mode, never in mock mode, per the same "must work with zero real
 * environment" constraint everything else here follows), so the Clerk-hook-using half must never
 * even render in mock mode, not just skip calling signOut().
 *
 * `variant` defaults to "secondary" (the original standalone-button look, still used as-is by
 * app/dashboard/page.tsx) — account-menu callers pass "ghost" plus a className to render it as a
 * plain destructive menu row instead of a boxed button.
 */
export function LogoutButton({ className, variant = "secondary" }: LogoutButtonProps) {
  return isMockMode ? (
    <MockLogoutButton className={className} variant={variant} />
  ) : (
    <ClerkLogoutButton className={className} variant={variant} />
  );
}

function MockLogoutButton({ className, variant }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      const { logout_token } = await authProvider.createLogoutFlow();
      await authProvider.submitLogout(logout_token);
      await authProvider.onLoggedOut();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <Button variant={variant} onClick={handleLogout} loading={loading} className={className}>
      {variant === "ghost" && <LogOut className="h-4 w-4" aria-hidden="true" />}
      Log out
    </Button>
  );
}

function ClerkLogoutButton({ className, variant }: LogoutButtonProps) {
  const router = useRouter();
  const { signOut } = useClerk();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await signOut();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <Button variant={variant} onClick={handleLogout} loading={loading} className={className}>
      {variant === "ghost" && <LogOut className="h-4 w-4" aria-hidden="true" />}
      Log out
    </Button>
  );
}
