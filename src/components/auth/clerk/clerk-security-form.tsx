"use client";

import { useState, type FormEvent } from "react";
import { useUser, useReverification } from "@clerk/nextjs";
import { Button } from "@/components/reference/ui/button";
import { Alert } from "@/components/reference/ui/alert";
import { PasswordInput } from "@/components/reference/ui/password-input";
import { Input } from "@/components/reference/ui/input";
import { Label } from "@/components/reference/ui/label";
import { cn } from "@/lib/utils";

/**
 * Clerk-mode counterpart to AuthFlowForm kind="settings" as used by /account/security and the
 * merchant/creator security-settings pages (all three render this same component, same as they
 * all shared one AuthFlowForm instance before — see D12's doc comment on the merchant one).
 * Password change + TOTP enroll/disable via the Clerk `User` resource instead of a Kratos
 * settings flow. Sensitive mutations go through `useReverification` per Clerk's own documented
 * pattern for this class of account change — it's a no-op pass-through when the account's Clerk
 * config doesn't actually require step-up auth, so wrapping unconditionally is safe either way.
 */
export function ClerkSecurityForm() {
  const { user, isLoaded } = useUser();

  // ---- password change ----
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const updatePassword = useReverification((args: { newPassword: string; currentPassword: string }) =>
    user?.updatePassword({ ...args, signOutOfOtherSessions: true }),
  );

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    if (newPassword !== confirmPassword) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    setPasswordBusy(true);
    try {
      await updatePassword({ newPassword, currentPassword });
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError("Couldn't update your password — check your current password and try again.");
    } finally {
      setPasswordBusy(false);
    }
  }

  // ---- TOTP enroll/disable ----
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpError, setTotpError] = useState<string | null>(null);
  const [totpBusy, setTotpBusy] = useState(false);
  const createTOTP = useReverification(() => user?.createTOTP());
  const disableTOTP = useReverification(() => user?.disableTOTP());

  async function startEnrollment() {
    setTotpError(null);
    setTotpBusy(true);
    try {
      const totp = await createTOTP();
      setTotpSecret(totp?.secret ?? totp?.uri ?? null);
    } catch {
      setTotpError("Couldn't start two-factor setup. Please try again.");
    } finally {
      setTotpBusy(false);
    }
  }

  async function handleVerifyTotp(e: FormEvent) {
    e.preventDefault();
    setTotpError(null);
    setTotpBusy(true);
    try {
      await user?.verifyTOTP({ code: totpCode });
      setTotpSecret(null);
      setTotpCode("");
    } catch {
      setTotpError("That code is incorrect.");
    } finally {
      setTotpBusy(false);
    }
  }

  async function handleDisable() {
    setTotpBusy(true);
    try {
      await disableTOTP();
    } finally {
      setTotpBusy(false);
    }
  }

  const totpEnabled = user?.totpEnabled ?? false;

  // AUDIT FIX — every mutation above reaches `user` through `?.`, which silently no-ops
  // (resolves to `undefined`, not a rejection) instead of throwing while Clerk is still loading
  // (useUser() starts as `{isLoaded: false, user: undefined}`) — submitting during that window
  // used to fall into the `try` block's success path and claim "password updated" when nothing
  // happened. Blocking the form until loaded (and erroring, not silently rendering nothing, if
  // still no user once loaded — the server-side gate on this page means that shouldn't happen)
  // fixes it at the one place that covers every handler, instead of repeating a `!user` guard in
  // each of them.
  if (!isLoaded) {
    return (
      <div className="space-y-4" aria-hidden="true">
        <div className="h-11 animate-pulse rounded-[var(--radius-sm)] bg-foreground/5" />
        <div className="h-11 animate-pulse rounded-[var(--radius-sm)] bg-foreground/5" />
        <div className="h-11 animate-pulse rounded-[var(--radius-sm)] bg-foreground/10" />
      </div>
    );
  }
  if (!user) {
    return <Alert variant="error">Couldn&apos;t load your account. Try refreshing the page.</Alert>;
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handlePasswordSubmit} noValidate className="space-y-4">
        {passwordError && <Alert variant="error">{passwordError}</Alert>}
        {passwordSuccess && <Alert variant="success">Your password has been updated. You&apos;ve been logged out of all other devices/sessions.</Alert>}
        <PasswordInput
          label="Current password"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <PasswordInput
          label="New password"
          required
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <PasswordInput
          label="Confirm password"
          required
          autoComplete="new-password"
          invalid={mismatch}
          errorText={mismatch ? "Passwords don't match." : undefined}
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (mismatch) setMismatch(false);
          }}
        />
        <Button type="submit" loading={passwordBusy} className="w-full">
          {passwordBusy ? "Please wait…" : "Change password"}
        </Button>
      </form>

      <div className={cn("space-y-3 border-t border-border pt-6")}>
        <p className="text-sm font-medium text-foreground">Two-factor authentication</p>
        {totpError && <Alert variant="error">{totpError}</Alert>}

        {totpEnabled ? (
          <>
            <Alert variant="info">Two-factor authentication is on for this account.</Alert>
            <Button variant="secondary" className="w-full" loading={totpBusy} onClick={handleDisable}>
              Turn off two-factor authentication
            </Button>
          </>
        ) : totpSecret ? (
          <form onSubmit={handleVerifyTotp} noValidate className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Scan this in your authenticator app, or enter it manually: <code className="break-all">{totpSecret}</code>
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="totp-enroll-code" required>
                6-digit code
              </Label>
              <Input
                id="totp-enroll-code"
                type="text"
                autoComplete="one-time-code"
                required
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
              />
            </div>
            <Button type="submit" loading={totpBusy} className="w-full">
              Turn on two-factor authentication
            </Button>
          </form>
        ) : (
          <Button variant="secondary" className="w-full" loading={totpBusy} onClick={startEnrollment}>
            Set up two-factor authentication
          </Button>
        )}
      </div>
    </div>
  );
}
