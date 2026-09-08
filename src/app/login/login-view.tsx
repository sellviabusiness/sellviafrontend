"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthFlowForm } from "@/components/auth/auth-flow-form";
import { ClerkLoginForm } from "@/components/auth/clerk/clerk-login-form";
import { AuthFooter } from "@/components/auth/auth-footer";
import { AuthLink } from "@/components/auth/auth-link";
import { isMockMode } from "@/lib/auth/config";
import { safeReturnTo } from "@/lib/auth/safe-return-to";

/**
 * AUDIT FIX — proxy.ts (and account/security, admin, support's own server-side guards) all send
 * an unauthenticated visitor here as `/login?return_to=<original path>`, but nothing ever read
 * that param: this always sent everyone to /dashboard post-login regardless, silently dropping
 * the page they actually asked for. `/dashboard` itself does role-based redirect, so this mostly
 * self-healed for role-appropriate pages, but never for anything outside that (e.g. hitting
 * /account/security while logged out landed back on /dashboard, not /account/security).
 *
 * safeReturnTo (lib/auth/safe-return-to.ts) only accepts a same-origin relative path — an
 * untrusted query param must never become an open redirect.
 */
export function LoginView() {
  const router = useRouter();
  const returnTo = safeReturnTo(useSearchParams().get("return_to"));

  return (
    <AuthLayout>
      <AuthCard>
        <AuthHeader heading="Welcome back" subheading="Log in to your SellVia account" />

        {isMockMode ? (
          <AuthFlowForm
            kind="login"
            returnTo={returnTo}
            onAuthenticated={() => router.replace(returnTo)}
          />
        ) : (
          <ClerkLoginForm returnTo={returnTo} />
        )}

        <p className="mt-3 text-right text-sm">
          <AuthLink href="/forgot-password">Forgot password?</AuthLink>
        </p>
      </AuthCard>

      <AuthFooter>
        Don&apos;t have an account? <AuthLink href="/register" emphasis>Create one</AuthLink>
      </AuthFooter>
    </AuthLayout>
  );
}
