"use client";

import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthFlowForm } from "@/components/auth/auth-flow-form";
import { AuthFooter } from "@/components/auth/auth-footer";
import { AuthLink } from "@/components/auth/auth-link";

export function ForgotPasswordView() {
  return (
    <AuthLayout>
      <AuthCard>
        <AuthHeader heading="Forgot your password?" subheading="Enter your email and we'll send you a reset link." />

        {/*
          Recovery flow: submitting the email moves the flow to "sent_email" — the provider's
          own info banner explains what happens next (mock: a fixed code; a real link-strategy
          Kratos project instead emails a link that lands the user on /reset-password directly).
        */}
        <AuthFlowForm kind="recovery" returnTo="/reset-password" />
      </AuthCard>

      <AuthFooter>
        <AuthLink href="/login" emphasis>Back to login</AuthLink>
      </AuthFooter>
    </AuthLayout>
  );
}
