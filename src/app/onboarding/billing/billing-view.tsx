"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { OnboardingLayout } from "@/components/onboarding/onboarding-layout";
import { OnboardingNav } from "@/components/onboarding/onboarding-nav";
import { OnboardingSkeleton } from "@/components/onboarding/onboarding-skeleton";
import { ConnectionStatusBanner } from "@/components/onboarding/connection-status";
import { useOnboardingStep } from "@/components/onboarding/use-onboarding-step";
import { Button } from "@/components/reference/ui/button";
import { FormErrorText } from "@/components/reference/ui/form-error-text";
import { billingAdapter } from "@/lib/onboarding/integrations/billing";
import { STEP_PATH, stepAfter, stepBefore } from "@/lib/onboarding/steps";
import type { ConnectionStatus } from "@/lib/onboarding/types";

/**
 * C2 — Switch billing connect. Talks only to lib/onboarding/integrations/billing.ts's
 * IntegrationAdapter, never a concrete SDK — swapping in the real Switch widget/redirect later
 * doesn't touch this file. Continue is blocked (not just disabled — an explicit message, per
 * spec) until the adapter reports "connected".
 */
export function BillingView({ email, sessionRoles }: { email: string; sessionRoles: string[] }) {
  const router = useRouter();
  const { record, ready, roles } = useOnboardingStep("billing", email, sessionRoles);
  const [status, setStatus] = useState<ConnectionStatus>("not_connected");
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (record) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus(record.billingStatus ?? "not_connected");
    }
  }, [record]);

  async function handleConnect() {
    setBlocked(false);
    setStatus("connecting");
    const result = await billingAdapter.connect(email);
    setStatus(result.status);
  }

  function handleContinue(e: FormEvent) {
    e.preventDefault();
    if (status !== "connected") {
      setBlocked(true);
      return;
    }
    const next = stepAfter("billing", roles) ?? "store-connect";
    router.push(STEP_PATH[next]);
  }

  const back = stepBefore("billing", roles);

  return (
    <OnboardingLayout step="billing" roles={roles}>
      <div className="mb-5 space-y-1">
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">
          Connect billing
        </h1>
        <p className="text-sm text-muted-foreground">
          SellVia uses Switch to collect commissions and manage campaign billing. Connect billing before you launch
          your first campaign.
        </p>
      </div>

      {!ready ? (
        <OnboardingSkeleton />
      ) : (
        <form onSubmit={handleContinue} className="space-y-4" noValidate>
          <ConnectionStatusBanner
            status={status}
            notConnectedLabel="Billing connection required"
            connectingLabel="Connecting billing…"
            connectedLabel="Billing connected — ready"
          />

          {status !== "connected" && (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={handleConnect}
              loading={status === "connecting"}
            >
              Connect billing
            </Button>
          )}

          {blocked && (
            <FormErrorText id="billing-blocked">
              Billing connection required before you can launch campaigns.
            </FormErrorText>
          )}

          <OnboardingNav onBack={back ? () => router.push(STEP_PATH[back]) : undefined} />
        </form>
      )}
    </OnboardingLayout>
  );
}
