"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthHeader } from "@/components/auth/auth-header";
import { RoleSelector } from "@/components/auth/role-selector";
import { Button } from "@/components/reference/ui/button";
import { Alert } from "@/components/reference/ui/alert";
import { updateClerkRoles } from "@/app/actions/clerk-profile";

export function ChooseRoleView() {
  const router = useRouter();
  const [roles, setRoles] = useState<string[]>([]);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const roleError = attemptedSubmit && roles.length === 0 ? "Choose whether you're joining as a Merchant or Creator." : null;

  async function handleSubmit() {
    setAttemptedSubmit(true);
    if (roles.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateClerkRoles(roles);
    } catch {
      setSubmitting(false);
      setError("Couldn't save your role. Try again.");
      return;
    }
    // /dashboard itself redirects to /merchant/overview, /creator/overview, or /onboarding —
    // same landing logic every other sign-in path already goes through, nothing OAuth-specific
    // needed here.
    router.replace("/dashboard");
  }

  return (
    <AuthLayout>
      <AuthCard>
        <AuthHeader heading="One more thing" subheading="How do you want to use SellVia?" />
        <div className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          {roleError && <Alert variant="error">{roleError}</Alert>}
          <RoleSelector selected={roles} onChange={setRoles} disabled={submitting} />
          <Button type="button" className="w-full" loading={submitting} onClick={() => void handleSubmit()}>
            {submitting ? "Please wait…" : "Continue"}
          </Button>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
