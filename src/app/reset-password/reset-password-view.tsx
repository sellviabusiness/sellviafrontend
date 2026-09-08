"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthFlowForm } from "@/components/auth/auth-flow-form";
import { ClerkResetPasswordForm } from "@/components/auth/clerk/clerk-reset-password-form";
import { AuthFooter } from "@/components/auth/auth-footer";
import { AuthLink } from "@/components/auth/auth-link";
import { PasswordInput } from "@/components/reference/ui/password-input";
import { Alert } from "@/components/reference/ui/alert";
import { Button } from "@/components/reference/ui/button";
import { isMockMode } from "@/lib/auth/config";

export function ResetPasswordView() {
  const router = useRouter();
  const [confirmValue, setConfirmValue] = useState("");
  const [mismatch, setMismatch] = useState(false);

  if (!isMockMode) {
    return (
      <AuthLayout>
        <AuthCard>
          <AuthHeader heading="Set a new password" subheading="Enter your new password below." />
          <ClerkResetPasswordForm />
        </AuthCard>
        <AuthFooter>
          <AuthLink href="/login" emphasis>Back to login</AuthLink>
        </AuthFooter>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard>
        <AuthHeader heading="Set a new password" subheading="Enter your new password below." />

        {/*
          "Confirm password" is a client-only convenience field — it has no `name`, so it's
          never part of the submitted FormData; the provider only ever receives `password`.
          Checked here (capture phase, before AuthFlowForm's own submit handler runs) by
          comparing against the real password input's live DOM value.
        */}
        <div
          onSubmitCapture={(e) => {
            const form = e.target as HTMLFormElement;
            const passwordInput = form.querySelector<HTMLInputElement>('input[name="password"]');
            if (passwordInput && passwordInput.value !== confirmValue) {
              e.preventDefault();
              e.stopPropagation();
              setMismatch(true);
            } else {
              setMismatch(false);
            }
          }}
        >
          <AuthFlowForm
            kind="settings"
            extraFields={
              <PasswordInput
                label="Confirm password"
                required
                autoComplete="new-password"
                value={confirmValue}
                onChange={(e) => {
                  setConfirmValue(e.target.value);
                  if (mismatch) setMismatch(false);
                }}
                invalid={mismatch}
                errorText={mismatch ? "Passwords don't match." : undefined}
              />
            }
            successBanner={(flow) =>
              flow.state === "success" ? (
                <div className="space-y-4">
                  <Alert variant="success">Your password has been updated.</Alert>
                  {/*
                    B3 — task's own instruction: don't state this as fact unless it's actually
                    true. This branch only ever renders in mock mode now (the clerk-mode version
                    of this screen is ClerkResetPasswordForm, returned above before this code
                    runs at all, and its own copy of this same claim is genuinely true — Clerk's
                    resetPasswordEmailCode.submitPassword is called with
                    signOutOfOtherSessions: true). The mock has no server-side session store at
                    all (see mock/session-cookie.ts) — "session" is a single plain cookie this
                    browser trusts, nothing tracks or could invalidate a *different*
                    browser/device's copy, so claiming otherwise here would be exactly the
                    false-copy-over-real-behavior the task warned against.
                  */}
                  <p className="text-xs text-muted-foreground">
                    (Dev mode note: this demo auth doesn&apos;t track other sessions/devices, so
                    nothing was actually signed out elsewhere — see the audit report.)
                  </p>
                  <Button className="w-full" onClick={() => router.push("/dashboard")}>
                    Continue
                  </Button>
                </div>
              ) : null
            }
          />
        </div>
      </AuthCard>

      <AuthFooter>
        <AuthLink href="/login" emphasis>Back to login</AuthLink>
      </AuthFooter>
    </AuthLayout>
  );
}
