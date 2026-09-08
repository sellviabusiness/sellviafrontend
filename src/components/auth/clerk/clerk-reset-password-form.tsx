"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/reference/ui/button";
import { Input } from "@/components/reference/ui/input";
import { Label } from "@/components/reference/ui/label";
import { Alert } from "@/components/reference/ui/alert";
import { PasswordInput } from "@/components/reference/ui/password-input";
import { FormErrorText } from "@/components/reference/ui/form-error-text";
import { clerkFieldError, clerkGlobalError } from "./clerk-errors";

/**
 * Clerk-mode counterpart to AuthFlowForm kind="settings" as used by /reset-password — the
 * "verify code, then set a new password" half of the same `signIn` resource
 * ClerkForgotPasswordForm started (see its own doc comment). Two steps in one component, same
 * as this app's mock/kratos version split them across two pages but not two providers' worth of
 * state: `signIn.status === "needs_new_password"` is what tells them apart here.
 */
export function ClerkResetPasswordForm() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const [done, setDone] = useState(false);
  const [deviceCode, setDeviceCode] = useState("");
  const [deviceCodeSendError, setDeviceCodeSendError] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const submitting = fetchStatus === "fetching";

  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault();
    const { error } = await signIn.resetPasswordEmailCode.verifyCode({ code });
    if (error) return;
  }

  // ROOT CAUSE FOUND LIVE — confirmed via `clerk config pull`: this Clerk project has
  // organization_settings.force_organization_selection = true, so every session gets a
  // `currentTask` before Clerk considers it complete. Real fix is `clerk disable orgs` (this app
  // has no Organizations concept); this fails loud instead of silently stranding the user now.
  async function finalize() {
    await signIn.finalize({
      navigate: ({ session }) => {
        if (session?.currentTask) {
          setTaskError(
            `Your account needs an extra step (${session.currentTask.key}) this app doesn't support yet — contact support.`,
          );
          return;
        }
        setDone(true);
      },
    });
  }

  async function handleSetPassword(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    const { error } = await signIn.resetPasswordEmailCode.submitPassword({
      password,
      signOutOfOtherSessions: true,
    });
    if (error) return;

    if (signIn.status === "complete") {
      await finalize();
      return;
    }
    // Same real bug as ClerkLoginForm, same fix — setting the new password creates a session
    // too, so a browser Clerk doesn't recognize yet can land here needing Device Trust
    // verification instead of going straight to "complete".
    if (signIn.status === "needs_client_trust") {
      const { error: sendError } = await signIn.mfa.sendEmailCode();
      setDeviceCodeSendError(sendError ? "Couldn't send a verification code. Try Resend code below." : null);
    }
  }

  async function handleDeviceTrustSubmit(e: FormEvent) {
    e.preventDefault();
    const { error } = await signIn.mfa.verifyEmailCode({ code: deviceCode });
    if (error) return;
    if (signIn.status === "complete") await finalize();
  }

  if (taskError) {
    return <Alert variant="error">{taskError}</Alert>;
  }

  if (done) {
    return (
      <div className="space-y-4">
        <Alert variant="success">Your password has been updated.</Alert>
        <Alert variant="info">For your security, you&apos;ve been logged out of all other devices/sessions.</Alert>
        <Button className="w-full" onClick={() => router.push("/dashboard")}>
          Continue
        </Button>
      </div>
    );
  }

  if (signIn.status === "needs_client_trust") {
    const codeError = clerkFieldError(errors, "code");
    return (
      <form onSubmit={handleDeviceTrustSubmit} noValidate className="space-y-4">
        {deviceCodeSendError ? (
          <Alert variant="error">{deviceCodeSendError}</Alert>
        ) : (
          <Alert variant="info">We don&apos;t recognize this device — enter the verification code we emailed you.</Alert>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="reset-device-code" required>
            Verification code
          </Label>
          <Input
            id="reset-device-code"
            name="code"
            type="text"
            icon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
            autoComplete="one-time-code"
            required
            invalid={!!codeError}
            aria-describedby={codeError ? "reset-device-code-error" : undefined}
            value={deviceCode}
            onChange={(e) => setDeviceCode(e.target.value)}
          />
          {codeError && <FormErrorText id="reset-device-code-error">{codeError}</FormErrorText>}
        </div>
        <div className="flex flex-col gap-2 pt-1">
          <Button type="submit" loading={submitting} className="w-full">
            {submitting ? "Please wait…" : "Verify"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => void signIn.mfa.sendEmailCode().then(({ error }) => setDeviceCodeSendError(error ? "Couldn't send a verification code. Try again." : null))}
          >
            Resend code
          </Button>
        </div>
      </form>
    );
  }

  if (signIn.status === "needs_new_password") {
    const passwordError = clerkFieldError(errors, "password");
    return (
      <form onSubmit={handleSetPassword} noValidate className="space-y-4">
        <PasswordInput
          label="New password"
          name="password"
          required
          autoComplete="new-password"
          invalid={!!passwordError}
          errorText={passwordError}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordInput
          label="Confirm password"
          required
          autoComplete="new-password"
          invalid={mismatch}
          errorText={mismatch ? "Passwords don't match." : undefined}
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            if (mismatch) setMismatch(false);
          }}
        />
        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? "Please wait…" : "Set new password"}
        </Button>
      </form>
    );
  }

  const codeError = clerkFieldError(errors, "code");
  const banner = clerkGlobalError(errors);

  return (
    <form onSubmit={handleVerifyCode} noValidate className="space-y-4">
      {banner && <Alert variant="error">{banner}</Alert>}
      <div className="space-y-1.5">
        <Label htmlFor="reset-code" required>
          Verification code
        </Label>
        <Input
          id="reset-code"
          name="code"
          type="text"
          icon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
          autoComplete="one-time-code"
          required
          invalid={!!codeError}
          aria-describedby={codeError ? "reset-code-error" : undefined}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        {codeError && <FormErrorText id="reset-code-error">{codeError}</FormErrorText>}
      </div>
      <Button type="submit" loading={submitting} className="w-full">
        {submitting ? "Please wait…" : "Verify code"}
      </Button>
    </form>
  );
}
