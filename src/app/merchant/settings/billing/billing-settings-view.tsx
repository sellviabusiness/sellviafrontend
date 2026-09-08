"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { ConnectionStatusBanner } from "@/components/onboarding/connection-status";
import { billingAdapter } from "@/lib/onboarding/integrations/billing";
import { getOnboardingRecord } from "@/lib/onboarding/store";
import type { ConnectionStatus } from "@/lib/onboarding/types";

/**
 * D11 — "post-onboarding entry point into the same billing-connect flow as C2." Reuses C2's
 * exact adapter (lib/onboarding/integrations/billing.ts) and status banner
 * (components/onboarding/connection-status.tsx) rather than a second billing-connect
 * implementation — the only difference from the onboarding step is this screen's chrome
 * (Settings page, not the onboarding wizard) and that it's reachable any time after onboarding,
 * not just once during it.
 */
export function BillingSettingsView({ email }: { email: string }) {
  const [status, setStatus] = useState<ConnectionStatus>("not_connected");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus(getOnboardingRecord(email)?.billingStatus ?? "not_connected");
    setReady(true);
  }, [email]);

  async function handleConnect() {
    setStatus("connecting");
    const result = await billingAdapter.connect(email);
    setStatus(result.status);
  }

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href="/merchant/settings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Settings
      </Link>

      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Billing method</h1>
        <p className="text-sm text-muted-foreground">SellVia bills your connected account for commission owed each cycle.</p>
      </div>

      <Card className="space-y-4 p-6">
        <ConnectionStatusBanner
          status={status}
          notConnectedLabel="Billing connection required"
          connectingLabel="Connecting billing…"
          connectedLabel="Billing connected — ready"
        />
        {status !== "connected" && (
          <Button variant="secondary" className="w-full" onClick={handleConnect} loading={status === "connecting"}>
            {status === "connecting" ? "Connecting…" : "Connect billing"}
          </Button>
        )}
      </Card>
    </div>
  );
}
