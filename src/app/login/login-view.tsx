"use client";

import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthFlowForm } from "@/components/auth/auth-flow-form";
import { AuthFooter } from "@/components/auth/auth-footer";
import { AuthLink } from "@/components/auth/auth-link";

export function LoginView() {
  const router = useRouter();

  return (
    <AuthLayout>
      <AuthCard>
        <AuthHeader heading="Welcome back" subheading="Log in to your SellVia account" />

        <AuthFlowForm
          kind="login"
          returnTo="/dashboard"
          onAuthenticated={() => router.replace("/dashboard")}
        />

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
