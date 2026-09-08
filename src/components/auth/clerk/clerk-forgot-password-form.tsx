"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { Mail } from "lucide-react";
import { Button } from "@/components/reference/ui/button";
import { Input } from "@/components/reference/ui/input";
import { Label } from "@/components/reference/ui/label";
import { Alert } from "@/components/reference/ui/alert";
import { FormErrorText } from "@/components/reference/ui/form-error-text";
import { clerkFieldError, clerkGlobalError } from "./clerk-errors";

/**
 * Clerk-mode counterpart to AuthFlowForm kind="recovery" — the "request a code" half only.
 * Clerk's reset-password is one continuous `signIn` resource (useSignIn()'s return value is a
 * shared client-side singleton, not tied to this component), not a separate flow id the way
 * Kratos's recovery flow is — /reset-password (ClerkResetPasswordForm) picks up the SAME
 * `signIn` resource via its own useSignIn() call to verify the code and set the new password,
 * same two-route shape the Kratos version already had.
 */
export function ClerkForgotPasswordForm() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const submitting = fetchStatus === "fetching";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const { error: createError } = await signIn.create({ identifier: email });
    if (createError) return;
    const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
    if (sendError) return;
    router.push("/reset-password");
  }

  const emailError = clerkFieldError(errors, "identifier");
  const banner = clerkGlobalError(errors);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {banner && <Alert variant="error">{banner}</Alert>}
      <div className="space-y-1.5">
        <Label htmlFor="forgot-email" required>
          Email
        </Label>
        <Input
          id="forgot-email"
          name="email"
          type="email"
          icon={<Mail className="h-4 w-4" aria-hidden="true" />}
          autoComplete="email"
          required
          invalid={!!emailError}
          aria-describedby={emailError ? "forgot-email-error" : undefined}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {emailError && <FormErrorText id="forgot-email-error">{emailError}</FormErrorText>}
      </div>
      <Button type="submit" loading={submitting} className="w-full">
        {submitting ? "Please wait…" : "Send reset link"}
      </Button>
    </form>
  );
}
