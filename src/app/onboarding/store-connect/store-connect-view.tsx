"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { OnboardingLayout } from "@/components/onboarding/onboarding-layout";
import { OnboardingNav } from "@/components/onboarding/onboarding-nav";
import { OnboardingSkeleton } from "@/components/onboarding/onboarding-skeleton";
import { ConnectionStatusBanner } from "@/components/onboarding/connection-status";
import { useOnboardingStep } from "@/components/onboarding/use-onboarding-step";
import { Label } from "@/components/reference/ui/label";
import { Input } from "@/components/reference/ui/input";
import { Button } from "@/components/reference/ui/button";
import { FormErrorText } from "@/components/reference/ui/form-error-text";
import { shopifyAdapter } from "@/lib/onboarding/integrations/shopify";
import { STEP_PATH, stepAfter, stepBefore } from "@/lib/onboarding/steps";
import type { ConnectionStatus } from "@/lib/onboarding/types";

/**
 * C3 — Shopify store connect. Talks only to lib/onboarding/integrations/shopify.ts's
 * IntegrationAdapter — no real OAuth app exists yet, so "Connect Shopify" simulates the
 * redirect boundary + webhook-active confirmation rather than inventing real credentials.
 *
 * SIMPLIFIED (this session's own explicit instruction): one field, one button, one clear
 * connected/not-connected status line with a reason on failure — no explanatory blocks. The
 * "About discount-code tracking" info block and the multi-item troubleshooting checklist were
 * both removed; that level of detail belongs in help docs, not the onboarding step itself.
 */
export function StoreConnectView({ email, sessionRoles }: { email: string; sessionRoles: string[] }) {
  const router = useRouter();
  const { record, ready, roles } = useOnboardingStep("store-connect", email, sessionRoles);
  const [storeUrl, setStoreUrl] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>("not_connected");
  const [error, setError] = useState<string | undefined>();
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (record) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus(record.storeConnectionStatus ?? "not_connected");
      setError(record.storeConnectionError);
    }
  }, [record]);

  async function handleConnect() {
    setBlocked(false);
    setStatus("connecting");
    setError(undefined);
    // Real Shopify OAuth is a browser redirect to the store's install-app URL; this mock
    // simulates that boundary in place rather than actually navigating away, since there's no
    // real OAuth app/callback route to redirect to yet.
    const result = await shopifyAdapter.connect(email, { storeUrl });
    setStatus(result.status);
    setError(result.error);
  }

  function handleContinue(e: FormEvent) {
    e.preventDefault();
    if (status !== "connected") {
      setBlocked(true);
      return;
    }
    const next = stepAfter("store-connect", roles) ?? "transition";
    router.push(STEP_PATH[next]);
  }

  const back = stepBefore("store-connect", roles);

  return (
    <OnboardingLayout step="store-connect" roles={roles}>
      <div className="mb-5 space-y-1">
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">
          Connect your Shopify store
        </h1>
      </div>

      {!ready ? (
        <OnboardingSkeleton />
      ) : (
        <form onSubmit={handleContinue} className="space-y-4" noValidate>
          {status !== "connected" && (
            <div className="space-y-1.5">
              <Label htmlFor="storeUrl" required>Shopify store URL</Label>
              <Input
                id="storeUrl"
                placeholder="your-store.myshopify.com"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                disabled={status === "connecting"}
                invalid={status === "error"}
              />
            </div>
          )}

          <ConnectionStatusBanner
            status={status}
            notConnectedLabel="Shopify not connected"
            connectingLabel="Connecting to Shopify…"
            connectedLabel="Shopify connected"
            errorLabel={error ? `Shopify not connected — ${error}` : undefined}
          />

          {status !== "connected" && (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={handleConnect}
              loading={status === "connecting"}
            >
              {status === "error" ? "Try again" : "Connect Shopify"}
            </Button>
          )}

          {blocked && (
            <FormErrorText id="store-blocked">Connect your Shopify store before continuing.</FormErrorText>
          )}

          <OnboardingNav onBack={back ? () => router.push(STEP_PATH[back]) : undefined} />
        </form>
      )}
    </OnboardingLayout>
  );
}
