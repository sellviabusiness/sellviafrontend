"use client";

import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthFlowForm } from "@/components/auth/auth-flow-form";
import { ClerkLoginForm } from "@/components/auth/clerk/clerk-login-form";
import { isMockMode } from "@/lib/auth/config";

/**
 * The ONLY sign-in path for admin accounts — /login now actively refuses one (see its
 * ClerkLoginForm's `blockRoles={["admin"]}`), on top of this page's own two layers: proxy.ts
 * blocks the request entirely before it even reaches Next (IP allowlist, `ADMIN_LOGIN_ALLOWED_IPS`
 * — see its own doc comment for the trust-boundary caveat), and `requireRole="admin"` here signs
 * a non-admin session straight back out rather than letting it navigate anywhere. No footer link
 * to /register (admin has no self-serve signup, same as everywhere else in this app), no
 * Google/Apple buttons (no OAuth path has ever created — or should create — an admin account),
 * and no "Forgot password?" — admin credentials are set directly (seeded), not self-service.
 */
export function AdminLoginView() {
  const router = useRouter();

  return (
    <AuthLayout>
      <AuthCard>
        <AuthHeader heading="Admin sign-in" subheading="Restricted access — SellVia staff only" />

        {isMockMode ? (
          <AuthFlowForm
            kind="login"
            returnTo="/admin/dashboard"
            onAuthenticated={() => router.replace("/admin/dashboard")}
          />
        ) : (
          <ClerkLoginForm returnTo="/admin/dashboard" requireRole="admin" showOAuth={false} />
        )}
      </AuthCard>
    </AuthLayout>
  );
}
