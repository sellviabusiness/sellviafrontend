"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/reference/ui/button";
import { Input } from "@/components/reference/ui/input";
import { Label } from "@/components/reference/ui/label";
import { Alert } from "@/components/reference/ui/alert";
import { FormErrorText } from "@/components/reference/ui/form-error-text";
import { clerkFieldError, clerkGlobalError } from "./clerk-errors";

/**
 * Clerk-mode counterpart to AuthFlowForm kind="verification" — a fallback only. Clerk ties email
 * verification to the SAME `signUp` resource created on /register (ClerkRegisterForm handles it
 * inline, right there, rather than redirecting here the way Kratos's `continue_with:
 * show_verification_ui` does), so this page is only reachable in clerk mode via a stray direct
 * visit or a stale bookmark — it can resume an in-progress sign-up's verification (the `signUp`
 * resource persists across a client-side route change) but has no way to start one from scratch.
 */
export function ClerkVerifyEmailForm() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [taskError, setTaskError] = useState<string | null>(null);
  const submitting = fetchStatus === "fetching";

  const inProgress =
    signUp.status === "missing_requirements" && signUp.unverifiedFields.includes("email_address");

  // ROOT CAUSE FOUND LIVE — confirmed via `clerk config pull`: this Clerk project has
  // organization_settings.force_organization_selection = true, so every session gets a
  // `currentTask` before Clerk considers it complete. Real fix is `clerk disable orgs` (this app
  // has no Organizations concept); this fails loud instead of silently stranding the user now.
  if (taskError) {
    return <Alert variant="error">{taskError}</Alert>;
  }

  if (!inProgress) {
    return (
      <div className="space-y-4">
        <Alert variant="info">There&apos;s no verification in progress in this browser.</Alert>
        <Button className="w-full" onClick={() => router.push("/register")}>
          Go to sign up
        </Button>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const { error } = await signUp.verifications.verifyEmailCode({ code });
    if (error) return;
    if (signUp.status !== "complete") return;

    await signUp.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          setTaskError(
            `Your account needs an extra step (${session.currentTask.key}) this app doesn't support yet — contact support.`,
          );
          return;
        }
        const url = decorateUrl("/dashboard");
        if (url.startsWith("http")) window.location.href = url;
        else router.replace(url);
      },
    });
  }

  const codeError = clerkFieldError(errors, "code");
  const banner = clerkGlobalError(errors);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {banner && <Alert variant="error">{banner}</Alert>}
      <div className="space-y-1.5">
        <Label htmlFor="verify-code" required>
          Verification code
        </Label>
        <Input
          id="verify-code"
          name="code"
          type="text"
          icon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
          autoComplete="one-time-code"
          required
          invalid={!!codeError}
          aria-describedby={codeError ? "verify-code-error" : undefined}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        {codeError && <FormErrorText id="verify-code-error">{codeError}</FormErrorText>}
      </div>
      <div className="flex flex-col gap-2 pt-1">
        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? "Please wait…" : "Verify"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => void signUp.verifications.sendEmailCode()}
        >
          Resend code
        </Button>
      </div>
    </form>
  );
}
