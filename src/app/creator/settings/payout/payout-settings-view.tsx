"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { ConnectionStatusBanner } from "@/components/onboarding/connection-status";
import { payoutProviderAdapter } from "@/lib/onboarding/integrations/payout-provider";
import { getOnboardingRecord } from "@/lib/onboarding/store";
import type { ConnectionStatus } from "@/lib/onboarding/types";

/**
 * E9 — "post-onboarding entry point into the same Switch payee flow as C4." Reuses C4's exact
 * adapter (lib/onboarding/integrations/payout-provider.ts) and status banner, same pattern
 * Merchant D11 already established for reusing C2's billing adapter — not a second payout
 * implementation.
 */
export function PayoutSettingsView({ email }: { email: string }) {
  const [status, setStatus] = useState<ConnectionStatus>("not_connected");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus(getOnboardingRecord(email)?.payoutStatus ?? "not_connected");
    setReady(true);
  }, [email]);

  async function handleConnect() {
    setStatus("connecting");
    const result = await payoutProviderAdapter.connect(email);
    setStatus(result.status);
  }

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href="/creator/settings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Settings
      </Link>

      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Payout method</h1>
        <p className="text-sm text-muted-foreground">SellVia pays your commission to this connected account each cycle.</p>
      </div>

      <Card className="space-y-4 p-6">
        <ConnectionStatusBanner
          status={status}
          notConnectedLabel="Payout setup required"
          connectingLabel="Connecting…"
          connectedLabel="Payout method connected — ready"
        />
        {status !== "connected" && (
          <Button variant="secondary" className="w-full" onClick={handleConnect} loading={status === "connecting"}>
            {status === "connecting" ? "Connecting…" : "Connect payout method"}
          </Button>
        )}
      </Card>
    </div>
  );
}
