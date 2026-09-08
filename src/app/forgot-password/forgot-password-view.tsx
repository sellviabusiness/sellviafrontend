"use client";

import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthFlowForm } from "@/components/auth/auth-flow-form";
import { ClerkForgotPasswordForm } from "@/components/auth/clerk/clerk-forgot-password-form";
import { AuthFooter } from "@/components/auth/auth-footer";
import { AuthLink } from "@/components/auth/auth-link";
import { isMockMode } from "@/lib/auth/config";

export function ForgotPasswordView() {
  return (
    <AuthLayout>
      <AuthCard>
        <AuthHeader heading="Forgot your password?" subheading="Enter your email and we'll send you a reset link." />

        {/*
          Recovery flow: submitting the email moves the flow to "sent_email" — the provider's
          own info banner explains what happens next (mock: a fixed code; clerk mode: a real
          emailed code, see ClerkForgotPasswordForm).
        */}
        {isMockMode ? <AuthFlowForm kind="recovery" returnTo="/reset-password" /> : <ClerkForgotPasswordForm />}
      </AuthCard>

      <AuthFooter>
        <AuthLink href="/login" emphasis>Back to login</AuthLink>
      </AuthFooter>
    </AuthLayout>
  );
}
