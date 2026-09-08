"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { Mail, KeyRound } from "lucide-react";
import { Button } from "@/components/reference/ui/button";
import { Input } from "@/components/reference/ui/input";
import { Label } from "@/components/reference/ui/label";
import { Alert } from "@/components/reference/ui/alert";
import { PasswordInput } from "@/components/reference/ui/password-input";
import { FormErrorText } from "@/components/reference/ui/form-error-text";
import { clerkFieldError, clerkGlobalError } from "./clerk-errors";
import { useRedirectIfSignedIn } from "./use-redirect-if-signed-in";
import { safeReturnTo } from "@/lib/auth/safe-return-to";

/**
 * Clerk-mode counterpart to AuthFlowForm kind="login" — same visual pieces (Input/PasswordInput/
 * Button/Alert), driven by Clerk's headless useSignIn() instead of a Kratos-shaped flow. Handles
 * password sign-in, a TOTP second factor (Clerk: `needs_second_factor`), and new-device Device
 * Trust verification (Clerk: `needs_client_trust`) — this app's mock provider supports the AAL2
 * shape, so login's behavior doesn't regress switching providers.
 */
export function ClerkLoginForm({ returnTo, onAuthenticated }: { returnTo?: string; onAuthenticated?: () => void }) {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  // SECURITY (background review) — re-validated here rather than trusted from the caller: this
  // component shouldn't rely on every call site remembering to sanitize `returnTo` (login-view.tsx
  // currently does, via this same helper, but a future caller easily might not). Deliberately
  // NOT re-checked after decorateUrl() below — decorateUrl is Clerk's own SDK function, and an
  // absolute (cross-origin) result from it is the documented Safari ITP cookie-refresh mechanism,
  // not attacker-controlled; blocking it would break that, not close a real hole.
  const safeReturn = safeReturnTo(returnTo);
  const alreadySignedIn = useRedirectIfSignedIn(safeReturn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [deviceCode, setDeviceCode] = useState("");
  const [deviceCodeSendError, setDeviceCodeSendError] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const submitting = fetchStatus === "fetching";

  if (alreadySignedIn) {
    return <Alert variant="info">You&apos;re already signed in — redirecting…</Alert>;
  }

  // ROOT CAUSE FOUND LIVE — confirmed via `clerk config pull`: this Clerk project has
  // organization_settings.force_organization_selection = true, so every new session gets a
  // `currentTask` (org selection) before Clerk considers it complete. This app has no
  // Organizations concept anywhere (individual Merchant/Creator/Admin accounts only) — the fix
  // is turning that project setting off (`clerk disable orgs`), not building org-selection UI
  // this product doesn't want. This branch used to just `return` here — silently stranding
  // someone on the form with a session that técnically existed but nothing acted on, which is
  // exactly what looked like "nothing happens" / "already signed in" loops. Now it fails loud
  // instead of silent, and stays correct even if this Clerk project's org setting changes again.
  if (taskError) {
    return <Alert variant="error">{taskError}</Alert>;
  }

  async function finalize() {
    await signIn.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          setTaskError(
            `Your account needs an extra step (${session.currentTask.key}) this app doesn't support yet — contact support.`,
          );
          return;
        }
        onAuthenticated?.();
        const url = decorateUrl(safeReturn);
        if (url.startsWith("http")) window.location.href = url;
        else router.replace(url);
      },
    });
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    const { error } = await signIn.password({ emailAddress: email, password });
    if (error) return;
    if (signIn.status === "complete") {
      await finalize();
      return;
    }
    // BUG FOUND LIVE — confirmed against a real Clerk instance: signing in from a browser Clerk
    // has never seen before returns status `needs_client_trust`, not `complete`, even with the
    // right password. This used to be entirely unhandled — the password check silently
    // succeeded and handlePasswordSubmit just returned, so clicking "Log in" looked like it did
    // nothing (no error, no next step, button never even showed "Please wait…" for long). Device
    // Trust needs its own emailed code, same shape as the TOTP step below — see Clerk's Device
    // Trust custom-flow guide.
    if (signIn.status === "needs_client_trust") {
      const { error: sendError } = await signIn.mfa.sendEmailCode();
      setDeviceCodeSendError(sendError ? "Couldn't send a verification code. Try Resend code below." : null);
    }
  }

  async function handleTotpSubmit(e: FormEvent) {
    e.preventDefault();
    const { error } = await signIn.mfa.verifyTOTP({ code: totpCode });
    if (error) return;
    if (signIn.status === "complete") await finalize();
  }

  async function handleDeviceTrustSubmit(e: FormEvent) {
    e.preventDefault();
    const { error } = await signIn.mfa.verifyEmailCode({ code: deviceCode });
    if (error) return;
    if (signIn.status === "complete") await finalize();
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
          <Label htmlFor="login-device-code" required>
            Verification code
          </Label>
          <Input
            id="login-device-code"
            name="code"
            type="text"
            icon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
            autoComplete="one-time-code"
            required
            invalid={!!codeError}
            aria-describedby={codeError ? "login-device-code-error" : undefined}
            value={deviceCode}
            onChange={(e) => setDeviceCode(e.target.value)}
          />
          {codeError && <FormErrorText id="login-device-code-error">{codeError}</FormErrorText>}
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

  if (signIn.status === "needs_second_factor") {
    const codeError = clerkFieldError(errors, "code");
    return (
      <form onSubmit={handleTotpSubmit} noValidate className="space-y-4">
        <Alert variant="info">Enter the 6-digit code from your authenticator app.</Alert>
        <div className="space-y-1.5">
          <Label htmlFor="login-totp-code" required>
            Authentication code
          </Label>
          <Input
            id="login-totp-code"
            name="totp_code"
            type="text"
            autoComplete="one-time-code"
            required
            invalid={!!codeError}
            aria-describedby={codeError ? "login-totp-code-error" : undefined}
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value)}
          />
          {codeError && <FormErrorText id="login-totp-code-error">{codeError}</FormErrorText>}
        </div>
        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? "Please wait…" : "Verify"}
        </Button>
      </form>
    );
  }

  const identifierError = clerkFieldError(errors, "identifier");
  const passwordError = clerkFieldError(errors, "password");
  const banner = clerkGlobalError(errors);

  return (
    <form onSubmit={handlePasswordSubmit} noValidate className="space-y-4">
      {banner && <Alert variant="error">{banner}</Alert>}
      <div className="space-y-1.5">
        <Label htmlFor="login-email" required>
          Email
        </Label>
        <Input
          id="login-email"
          name="identifier"
          type="email"
          icon={<Mail className="h-4 w-4" aria-hidden="true" />}
          autoComplete="email"
          required
          invalid={!!identifierError}
          aria-describedby={identifierError ? "login-email-error" : undefined}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {identifierError && <FormErrorText id="login-email-error">{identifierError}</FormErrorText>}
      </div>
      <PasswordInput
        label="Password"
        name="password"
        required
        autoComplete="current-password"
        invalid={!!passwordError}
        errorText={passwordError}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button type="submit" loading={submitting} className="w-full">
        {submitting ? "Please wait…" : "Log in"}
      </Button>
      {/* Safety net for exactly the class of bug needs_client_trust turned out to be: an
          in-progress signIn attempt is tracked against this browser server-side (confirmed live
          — see ClerkRegisterForm's own "Start over" for the same finding on signUp), so a status
          this form doesn't yet know how to render, or one stuck from before a fix landed, would
          otherwise leave someone on an unresponsive form with no visible way out. Always
          rendered, not conditional on there being an attempt in progress — cheap and harmless
          when there isn't one. */}
      {signIn.id && (
        <button
          type="button"
          onClick={() => void signIn.reset()}
          className="w-full text-center text-xs text-muted-foreground-2 underline underline-offset-2 hover:text-foreground"
        >
          Trouble logging in? Start over
        </button>
      )}
    </form>
  );
}
