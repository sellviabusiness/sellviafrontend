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
import { PasswordInput } from "@/components/reference/ui/password-input";
import { Button } from "@/components/reference/ui/button";
import { Alert } from "@/components/reference/ui/alert";
import { FormErrorText } from "@/components/reference/ui/form-error-text";
import { shopifyAdapter } from "@/lib/onboarding/integrations/shopify";
import { saveStoreConnectionStatus } from "@/lib/onboarding/store";
import { STEP_PATH, stepAfter, stepBefore } from "@/lib/onboarding/steps";
import { isMockMode } from "@/lib/auth/config";
import { apiRequest, ApiError } from "@/lib/api";
import type { ConnectionStatus } from "@/lib/onboarding/types";

/** Same normalization the backend applies server-side (strips a leading scheme, a trailing
 *  slash, lowercases) before checking the .myshopify.com suffix — mirrored here only for
 *  instant field feedback. The backend's own check is still what actually decides this; a value
 *  that passes here still goes through the real PATCH and its real 400 handling below. */
function normalizeShopDomain(value: string): string {
  return value.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "").toLowerCase();
}
function looksLikeShopifyDomain(value: string): boolean {
  return normalizeShopDomain(value).endsWith(".myshopify.com");
}

/** The webhook endpoint the merchant pastes into their own Shopify Admin — derived from the
 *  same base URL every other backend call uses, with the versioned `/api/vN` prefix stripped
 *  (this route isn't versioned) and the fixed path appended, rather than hardcoding a guessed
 *  production domain. */
function getWebhookUrl(): string {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/api\/v\d+\/?$/i, "").replace(/\/+$/, "");
  return `${base}/webhooks/shopify-sales`;
}

interface ShopifyConnectionState {
  shopDomain: string | null;
  connected: boolean;
}

/**
 * C3 — Shopify store connect. "Option A" (manual connect, backend PR feature/clerk-sdk-role-
 * exclusivity, c367306): the merchant creates their own webhook in their own Shopify Admin and
 * pastes the two resulting values (shop domain + webhook signing secret) in here — there is no
 * OAuth flow, no install redirect, no callback route, and no auto-registration of the webhook on
 * Shopify's side. That's a separate, bigger, not-yet-built "Option B" — this screen must not
 * imply an OAuth redirect is happening (no "Connect with Shopify" button that looks like an
 * install flow).
 *
 * GET/PATCH /users/merchant-profile/shopify-connection supersede the old localStorage-only
 * mock (lib/onboarding/integrations/shopify.ts) in every mode except mock, which has no real
 * backend to call and keeps using that adapter unchanged. Merchant-only, and only reachable
 * once POST /users/merchant-profile has already succeeded (get_current_merchant_profile 404s
 * otherwise) — already guaranteed by steps.ts's getStepSequence ordering (business always comes
 * before store-connect).
 */
export function StoreConnectView({ email, id, sessionRoles }: { email: string; id: string; sessionRoles: string[] }) {
  const router = useRouter();
  const { record, ready, roles } = useOnboardingStep("store-connect", email, id, sessionRoles);

  // ---- mock mode: unchanged, single-field simulated adapter ----
  const [mockStoreUrl, setMockStoreUrl] = useState("");
  const [mockStatus, setMockStatus] = useState<ConnectionStatus>("not_connected");
  const [mockError, setMockError] = useState<string | undefined>();
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (isMockMode && record) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMockStatus(record.storeConnectionStatus ?? "not_connected");
      setMockError(record.storeConnectionError);
    }
  }, [record]);

  async function handleMockConnect() {
    setBlocked(false);
    setMockStatus("connecting");
    setMockError(undefined);
    const result = await shopifyAdapter.connect(email, { storeUrl: mockStoreUrl });
    setMockStatus(result.status);
    setMockError(result.error);
  }

  // ---- real mode: GET-then-PATCH against the actual backend ----
  const [connection, setConnection] = useState<ShopifyConnectionState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [shopDomain, setShopDomain] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isMockMode || !ready) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await apiRequest<ShopifyConnectionState>("/users/merchant-profile/shopify-connection");
        if (cancelled) return;
        setConnection(result);
        setShopDomain(result.shopDomain ?? "");
        saveStoreConnectionStatus(email, result.connected ? "connected" : "not_connected");
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.uiMessage : "Couldn't load your Shopify connection. Try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once ready flips true
  }, [ready]);

  /**
   * TEMPORARY DEV STUB — requested 2026-09-05: backend is reachable locally but Shopify itself
   * can't deliver webhook events to a localhost URL, so there's no real webhook to create/paste
   * yet. This skips the real PATCH entirely and marks the step connected client-side only (same
   * `saveStoreConnectionStatus` call the real success path already makes, at line ~144 — that's
   * what unblocks steps.ts's `isStepComplete("store-connect", ...)` gate for later steps).
   * `NEXT_PUBLIC_API_BASE_URL` in the backend's own DB is NOT updated by this — GET on this screen
   * after a refresh will still show not-connected, since nothing was actually persisted server-side.
   *
   * TO REVERT: once the backend is hosted somewhere Shopify can reach (a deploy, or a tunnel like
   * ngrok pointed at localhost:8000) and a real webhook + signing secret exist, delete this
   * function, the button below that calls it, and this comment — `handleRealConnect` is the real
   * flow and needs no changes.
   */
  function handleDevStubConnect() {
    const domain = shopDomain.trim() ? normalizeShopDomain(shopDomain) : "dev-stub.myshopify.com";
    setConnection({ shopDomain: domain, connected: true });
    setShowForm(false);
    setApiError(null);
    saveStoreConnectionStatus(email, "connected");
  }

  async function handleRealConnect() {
    const nextErrors: Record<string, string> = {};
    if (!shopDomain.trim()) nextErrors.shopDomain = "Enter your Shopify store domain.";
    else if (!looksLikeShopifyDomain(shopDomain)) {
      nextErrors.shopDomain = "That doesn't look like your Shopify domain — it should end in .myshopify.com.";
    }
    if (!webhookSecret.trim()) nextErrors.webhookSecret = "Enter the webhook signing secret Shopify gave you.";
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }
    setFieldErrors({});
    setApiError(null);
    setSubmitting(true);
    try {
      const result = await apiRequest<ShopifyConnectionState>("/users/merchant-profile/shopify-connection", {
        method: "PATCH",
        body: { shopDomain: normalizeShopDomain(shopDomain), webhookSecret: webhookSecret.trim() },
      });
      setConnection(result);
      setShowForm(false);
      setWebhookSecret("");
      saveStoreConnectionStatus(email, "connected");
    } catch (err) {
      setApiError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleContinue(e: FormEvent) {
    e.preventDefault();
    const connected = isMockMode ? mockStatus === "connected" : Boolean(connection?.connected);
    if (!connected) {
      setBlocked(true);
      return;
    }
    const next = stepAfter("store-connect", roles) ?? "transition";
    router.push(STEP_PATH[next]);
  }

  const back = stepBefore("store-connect", roles);

  if (!ready || (!isMockMode && !connection && !loadError)) {
    return (
      <OnboardingLayout step="store-connect" roles={roles}>
        <OnboardingSkeleton />
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout step="store-connect" roles={roles}>
      <div className="mb-5 space-y-1">
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">
          Connect your Shopify store
        </h1>
      </div>

      <form onSubmit={handleContinue} className="space-y-4" noValidate>
        {isMockMode ? (
          <>
            {mockStatus !== "connected" && (
              <div className="space-y-1.5">
                <Label htmlFor="storeUrl" required>Shopify store URL</Label>
                <Input
                  id="storeUrl"
                  placeholder="your-store.myshopify.com"
                  value={mockStoreUrl}
                  onChange={(e) => setMockStoreUrl(e.target.value)}
                  disabled={mockStatus === "connecting"}
                  invalid={mockStatus === "error"}
                />
              </div>
            )}
            <ConnectionStatusBanner
              status={mockStatus}
              notConnectedLabel="Shopify not connected"
              connectingLabel="Connecting to Shopify…"
              connectedLabel="Shopify connected"
              errorLabel={mockError ? `Shopify not connected — ${mockError}` : undefined}
            />
            {mockStatus !== "connected" && (
              <Button type="button" variant="secondary" className="w-full" onClick={handleMockConnect} loading={mockStatus === "connecting"}>
                {mockStatus === "error" ? "Try again" : "Connect Shopify"}
              </Button>
            )}
          </>
        ) : (
          <>
            {loadError && (
              <Alert variant="error">{loadError}</Alert>
            )}

            {connection?.connected && !showForm ? (
              <>
                <ConnectionStatusBanner
                  status="connected"
                  notConnectedLabel=""
                  connectingLabel=""
                  connectedLabel={`Connected: ${connection.shopDomain}`}
                />
                <Button type="button" variant="secondary" className="w-full" onClick={() => setShowForm(true)}>
                  Reconnect / change
                </Button>
              </>
            ) : (
              <>
                <Alert variant="info">
                  <p className="mb-2 font-medium">Before you connect, create a webhook in Shopify:</p>
                  <ol className="list-decimal space-y-1 pl-4">
                    <li>Shopify Admin → Settings → Notifications → scroll to Webhooks.</li>
                    <li>Click <span className="font-medium">Create webhook</span>.</li>
                    <li>Event: your order-payment event. Format: JSON.</li>
                    <li>
                      URL: <code className="rounded bg-foreground/10 px-1 py-0.5 text-xs">{getWebhookUrl()}</code>
                    </li>
                    <li>Shopify will show a signing secret — paste it below as the webhook secret.</li>
                    <li>Your shop domain (top of Shopify Admin) goes in the field below too.</li>
                  </ol>
                </Alert>

                {apiError && <Alert variant="error">{apiError}</Alert>}

                <div className="space-y-1.5">
                  <Label htmlFor="shopDomain" required>Shopify store domain</Label>
                  <Input
                    id="shopDomain"
                    placeholder="your-store.myshopify.com"
                    value={shopDomain}
                    onChange={(e) => setShopDomain(e.target.value)}
                    invalid={Boolean(fieldErrors.shopDomain)}
                  />
                  {fieldErrors.shopDomain && <FormErrorText id="shopDomain-error">{fieldErrors.shopDomain}</FormErrorText>}
                </div>

                <PasswordInput
                  label="Webhook signing secret"
                  id="webhookSecret"
                  placeholder="whsec_..."
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  invalid={Boolean(fieldErrors.webhookSecret)}
                  errorText={fieldErrors.webhookSecret}
                  required
                />

                <Button type="button" variant="secondary" className="w-full" onClick={handleRealConnect} loading={submitting}>
                  Connect Shopify
                </Button>

                {/* TEMPORARY DEV STUB — see handleDevStubConnect's doc comment for what this is and how to remove it. */}
                {process.env.NODE_ENV !== "production" && (
                  <Button type="button" variant="ghost" className="w-full" onClick={handleDevStubConnect}>
                    Simulate connection (dev only — no real webhook exists yet)
                  </Button>
                )}
              </>
            )}
          </>
        )}

        {blocked && (
          <FormErrorText id="store-blocked">Connect your Shopify store before continuing.</FormErrorText>
        )}

        <OnboardingNav onBack={back ? () => router.push(STEP_PATH[back]) : undefined} />
      </form>
    </OnboardingLayout>
  );
}
