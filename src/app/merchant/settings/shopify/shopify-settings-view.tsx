"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/reference/ui/card";
import { PasswordInput } from "@/components/reference/ui/password-input";
import { Button } from "@/components/reference/ui/button";
import { Alert } from "@/components/reference/ui/alert";
import { StatusBadge } from "@/components/reference/ui/status-badge";
import {
  getShopifyAdminConnection,
  connectShopifyAdmin,
  disconnectShopifyAdmin,
  type ShopifyAdminConnectionState,
} from "@/lib/merchant/real-store";
import { apiRequest, ApiError } from "@/lib/api";

/** Mirrors the local (non-exported) `ShopifyConnectionState` shape declared in
 *  src/app/onboarding/store-connect/store-connect-view.tsx — same GET response, redeclared here
 *  since that file doesn't export its interface. */
interface ShopDomainState {
  shopDomain: string | null;
  connected: boolean;
}

export function ShopifySettingsView() {
  const [domainState, setDomainState] = useState<ShopDomainState | null>(null);
  const [adminState, setAdminState] = useState<ShopifyAdminConnectionState | null>(null);
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await apiRequest<ShopDomainState>("/users/merchant-profile/shopify-connection");
        if (!cancelled) setDomainState(result);
      } catch {
        if (!cancelled) setDomainState({ shopDomain: null, connected: false });
      }
      try {
        const result = await getShopifyAdminConnection();
        if (!cancelled) setAdminState(result);
      } catch {
        if (!cancelled) setAdminState({ shopDomain: null, status: "needs_admin_token", connected: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const domainConnected = domainState?.connected ?? false;

  async function handleConnect() {
    if (!token.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const state = await connectShopifyAdmin(token.trim());
      setAdminState(state);
      setToken("");
    } catch (err) {
      if (err instanceof ApiError && err.code === "SHOPIFY_DOMAIN_NOT_CONNECTED") {
        setError("Connect your store domain first — see the Shopify domain section above.");
      } else {
        setError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisconnect() {
    setSubmitting(true);
    setError(null);
    try {
      setAdminState(await disconnectShopifyAdmin());
    } catch (err) {
      setError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/merchant/settings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Settings
      </Link>

      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Shopify connection</h1>
      </div>

      <Card className="space-y-2 p-6">
        <div className="flex items-center justify-between">
          <p className="font-medium text-foreground">Store domain</p>
          <StatusBadge tone={domainConnected ? "success" : "neutral"}>
            {domainConnected ? "Connected" : "Not connected"}
          </StatusBadge>
        </div>
        {domainState?.shopDomain && <p className="text-sm text-muted-foreground">{domainState.shopDomain}</p>}
        {!domainConnected && (
          <Link href="/onboarding/store-connect" className="text-xs text-accent-foreground underline underline-offset-2">
            Connect your store domain
          </Link>
        )}
      </Card>

      <Card
        className={`space-y-3 p-6 ${!domainConnected ? "opacity-50" : ""}`}
        title={!domainConnected ? "Connect your store domain first" : undefined}
      >
        <div className="flex items-center justify-between">
          <p className="font-medium text-foreground">Shopify Admin API</p>
          <StatusBadge tone={adminState?.status === "connected" ? "success" : adminState?.status === "revoked" ? "warning" : "neutral"}>
            {adminState?.status === "connected" ? "Connected" : adminState?.status === "revoked" ? "Revoked" : "Not connected"}
          </StatusBadge>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <p className="text-xs text-muted-foreground">
          Go to your Shopify Admin → Settings → Apps → Develop apps, create an app, grant
          write_discounts + read_orders, then paste the generated Admin API access token here.
        </p>

        {adminState?.status === "connected" ? (
          <Button type="button" variant="secondary" onClick={handleDisconnect} loading={submitting} disabled={!domainConnected}>
            Disconnect
          </Button>
        ) : (
          <div className="space-y-3">
            <PasswordInput
              label="Shopify Admin API access token"
              id="shopify-admin-token"
              placeholder="shpat_..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={!domainConnected}
            />
            <Button
              type="button"
              className="w-full"
              onClick={handleConnect}
              loading={submitting}
              disabled={!domainConnected || !token.trim()}
            >
              Connect
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
