"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
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
import { updateClerkRoles } from "@/app/actions/clerk-profile";

/**
 * Clerk-mode counterpart to AuthFlowForm kind="registration" — unlike Kratos's model (a separate
 * flow/route the app hands off to via `continue_with: show_verification_ui`, landing on
 * /verify-email), Clerk ties email verification to the SAME `signUp` resource created here, so
 * both steps live on this one screen (this is also the shape Clerk's own custom-flow guide
 * uses) rather than round-tripping through /verify-email. See that page's own doc comment for
 * what it's for in clerk mode instead.
 */
export function ClerkRegisterForm({
  returnTo,
  roles,
  extraFields,
  onAuthenticated,
}: {
  returnTo?: string;
  /** Selected roles (RoleSelector, owned by register-view.tsx) — written via a Server Action
   *  once the account is actually created, see finalize() below. */
  roles: string[];
  extraFields?: ReactNode;
  onAuthenticated?: () => void;
}) {
  const { signUp, errors, fetchStatus } = useSignUp();
  const router = useRouter();
  // SECURITY (background review) — re-validated here rather than trusted from the caller; see
  // the matching comment in clerk-login-form.tsx for why decorateUrl()'s own output isn't
  // re-checked the same way.
  const safeReturn = safeReturnTo(returnTo);
  const alreadySignedIn = useRedirectIfSignedIn(safeReturn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [sendCodeError, setSendCodeError] = useState<string | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const submitting = fetchStatus === "fetching" || finalizing;
  // Derived, not its own state — clears the instant they pick a role since it's recomputed every
  // render, no effect needed (roles is owned by register-view.tsx, a prop here).
  const roleError = attemptedSubmit && roles.length === 0 ? "Choose whether you're joining as a Merchant or Creator." : null;

  if (alreadySignedIn) {
    return <Alert variant="info">You&apos;re already signed in — redirecting…</Alert>;
  }

  // ROOT CAUSE FOUND LIVE — confirmed via `clerk config pull`: this Clerk project has
  // organization_settings.force_organization_selection = true, so every new session gets a
  // `currentTask` (org selection) before Clerk considers it complete — this is exactly what
  // "verification succeeds but it just comes back to the signup form" was: finalize() created
  // the session, but this callback used to just `return` on a pending task, doing nothing. This
  // app has no Organizations concept anywhere (individual Merchant/Creator/Admin accounts only)
  // — the real fix is turning that project setting off (`clerk disable orgs`), not building
  // org-selection UI this product doesn't want. This fails loud instead of silent now, and stays
  // correct even if the project's org setting changes again.
  if (taskError) {
    return <Alert variant="error">{taskError}</Alert>;
  }

  async function handleSignUpSubmit(e: FormEvent) {
    e.preventDefault();
    // AUDIT FIX — nothing here checked `roles` before creating the account: RoleSelector marks
    // the field required (red `*`) but signUp.password() went straight through regardless,
    // same gap the mock provider had (see its updateRegistration for the matching fix there).
    setAttemptedSubmit(true);
    if (roles.length === 0) return;
    const { error } = await signUp.password({ emailAddress: email, password });
    if (error) return;
    // AUDIT FIX — this result used to be discarded. `awaitingCode` below flips to true from
    // signUp.status alone (the account needs email verification) regardless of whether the code
    // actually sent, so a delivery failure here used to show the "enter your code" screen with
    // no code ever sent and no indication why — surfaced as a banner there instead now.
    const { error: sendError } = await signUp.verifications.sendEmailCode();
    setSendCodeError(sendError ? "Couldn't send a verification code. Try Resend code below." : null);
  }

  async function handleVerifySubmit(e: FormEvent) {
    e.preventDefault();
    const { error } = await signUp.verifications.verifyEmailCode({ code });
    if (error) return;
    if (signUp.status !== "complete") return;

    await signUp.finalize({
      // ROOT CAUSE FOUND LIVE — this used to fire updateClerkRoles() and navigate away in the
      // same breath (startTransition + a bare `void` call, deliberately not awaited, "best
      // effort"). That's exactly the problem: the Server Action and the redirect were racing
      // with nothing keeping them in order, so the redirect regularly won — landing in onboarding
      // before the role had actually finished writing to Clerk. `navigate` is allowed to return a
      // Promise (Clerk's own SetActiveNavigate type), so awaiting the write here — before
      // navigating, not alongside it — is what actually makes the two happen in the right order.
      //
      // The onboarding role-select step (that used to give a write failure here a second chance
      // to save, once the user confirmed/adjusted their role there) is gone now — role is chosen
      // once, here, only. So a failed write can no longer be silently swallowed and shrugged off
      // to "onboarding will handle it": there's nothing downstream to catch it any more, and an
      // already-created account with no role stored would fall through steps.ts's
      // getStepSequence([]) (no merchant/creator steps at all) and never reach either dashboard.
      // Fails loud instead, same pattern as the currentTask case right below.
      navigate: async ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          setTaskError(
            `Your account needs an extra step (${session.currentTask.key}) this app doesn't support yet — contact support.`,
          );
          return;
        }
        setFinalizing(true);
        const roleWriteFailed = await updateClerkRoles(roles).then(
          () => false,
          () => true,
        );
        if (roleWriteFailed) {
          setFinalizing(false);
          setTaskError("Your account was created, but we couldn't save your role. Contact support to finish setting it up.");
          return;
        }
        onAuthenticated?.();
        const url = decorateUrl(safeReturn);
        if (url.startsWith("http")) window.location.href = url;
        else router.replace(url);
      },
    });
  }

  const needsMoreThanEmailCode = signUp.status === "missing_requirements" && signUp.missingFields.length > 0;
  const awaitingCode =
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;

  // AUDIT FIX — `missing_requirements` used to only ever mean "needs the email code" here
  // (`awaitingCode`'s third condition assumed `missingFields` is always empty by then). If the
  // Clerk instance is configured to require another field this form doesn't collect
  // (username, name, ...), that assumption breaks: the account is already created
  // (signUp.password() succeeded) but `awaitingCode` stays false forever, and execution used to
  // fall through to the password/email form again with zero explanation — a dead end that looks
  // like nothing happened. Surfaced explicitly instead.
  if (needsMoreThanEmailCode) {
    return (
      <div className="space-y-4">
        <Alert variant="error">
          This account needs more information to finish signing up ({signUp.missingFields.join(", ")}), which
          this form doesn&apos;t collect. Contact support to finish creating your account.
        </Alert>
        {/* AUDIT FIX — confirmed live against a real Clerk instance: this half-created signUp
            attempt is tracked server-side against the browser's Clerk client, not just local
            React state, so it followed a full page reload/fresh navigation to /register and
            re-triggered this same dead end with an EMPTY form underneath — there was no way out
            except clearing cookies. signUp.reset() abandons the stuck attempt so a fresh one can
            start. */}
        <Button type="button" variant="secondary" className="w-full" onClick={() => void signUp.reset()}>
          Start over
        </Button>
      </div>
    );
  }

  if (awaitingCode) {
    const codeError = clerkFieldError(errors, "code");
    return (
      <form onSubmit={handleVerifySubmit} noValidate className="space-y-4">
        {sendCodeError ? <Alert variant="error">{sendCodeError}</Alert> : <Alert variant="info">We sent a verification code to {email}.</Alert>}
        <div className="space-y-1.5">
          <Label htmlFor="register-code" required>
            Verification code
          </Label>
          <Input
            id="register-code"
            name="code"
            type="text"
            icon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
            autoComplete="one-time-code"
            required
            invalid={!!codeError}
            aria-describedby={codeError ? "register-code-error" : undefined}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          {codeError && <FormErrorText id="register-code-error">{codeError}</FormErrorText>}
        </div>
        <div className="flex flex-col gap-2 pt-1">
          <Button type="submit" loading={submitting} className="w-full">
            {submitting ? "Please wait…" : "Verify code"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => void signUp.verifications.sendEmailCode().then(({ error }) => setSendCodeError(error ? "Couldn't send a verification code. Try again." : null))}
          >
            Resend code
          </Button>
        </div>
      </form>
    );
  }

  const emailError = clerkFieldError(errors, "emailAddress");
  const passwordError = clerkFieldError(errors, "password");
  const banner = clerkGlobalError(errors);

  return (
    <form onSubmit={handleSignUpSubmit} noValidate className="space-y-4">
      {banner && <Alert variant="error">{banner}</Alert>}
      {roleError && <Alert variant="error">{roleError}</Alert>}
      <div className="space-y-1.5">
        <Label htmlFor="register-email" required>
          Email
        </Label>
        <Input
          id="register-email"
          name="email"
          type="email"
          icon={<Mail className="h-4 w-4" aria-hidden="true" />}
          autoComplete="email"
          required
          invalid={!!emailError}
          aria-describedby={emailError ? "register-email-error" : undefined}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {emailError && <FormErrorText id="register-email-error">{emailError}</FormErrorText>}
      </div>
      <PasswordInput
        label="Password"
        name="password"
        required
        autoComplete="new-password"
        invalid={!!passwordError}
        errorText={passwordError}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {extraFields}
      <Button type="submit" loading={submitting} className="w-full">
        {submitting ? "Please wait…" : "Create account"}
      </Button>
      <div id="clerk-captcha" />
    </form>
  );
}
