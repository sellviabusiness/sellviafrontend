"use client";

import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthFlowForm } from "@/components/auth/auth-flow-form";
import { AuthFooter } from "@/components/auth/auth-footer";
import { AuthLink } from "@/components/auth/auth-link";

// B5's own stated policy — optional/Creator, recommended/Merchant, strongly
// recommended (not yet a hard requirement)/Admin. Same wording as the old
// page had, but now actually driven by the real session's `roles`, passed
// down from page.tsx's getServerSession() — not static copy that happened
// to describe roles no session data ever confirmed.
const MFA_GUIDANCE: Record<string, string> = {
  merchant: "Recommended for Merchant accounts — you handle real payouts.",
  creator: "Optional for Creator accounts.",
  admin: "Strongly recommended for Admin accounts (working default — not yet a hard requirement).",
};

export function SecurityView({ roles }: { roles: string[] }) {
  return (
    <AuthLayout>
      <AuthCard>
        <AuthHeader
          heading="Security"
          subheading="Change your password and set up two-factor authentication."
        />

        {roles.length > 0 && (
          <ul className="mb-4 flex flex-col gap-1 text-xs text-muted-foreground">
            {roles.map((role) =>
              MFA_GUIDANCE[role] ? <li key={role}>{MFA_GUIDANCE[role]}</li> : null,
            )}
          </ul>
        )}

        {/*
          kind="settings" with no ?flow= — createFlow now supports building a settings flow
          straight from the active session (see lib/auth/mock/provider.ts and
          lib/auth/kratos/provider.ts's createBrowserSettingsFlow), not just via the
          recovery-link handoff, which is the whole reason this page was reachable at all only
          through /forgot-password before. Same generic AuthFlowForm as everywhere else — the
          TOTP enroll/disable nodes it renders come entirely from what the provider returns.
        */}
        <AuthFlowForm kind="settings" allowFreshSettings />
      </AuthCard>

      <AuthFooter>
        <AuthLink href="/dashboard" emphasis>
          Back to dashboard
        </AuthLink>
      </AuthFooter>
    </AuthLayout>
  );
}
