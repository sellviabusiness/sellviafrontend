import { getOnboardingRecord, saveStoreConnectionStatus } from "../store";
import type { IntegrationAdapter, IntegrationConnectResult } from "./types";
import { delay } from "./types";

/**
 * MOCK DATA LAYER — C3 Shopify store connect.
 *
 * Stands in for:
 *   GET  /merchant/shopify/status           → { status: ConnectionStatus, error?: string }
 *   POST /merchant/shopify/connect { storeUrl } → { status: ConnectionStatus, redirectUrl?: string, error?: string }
 *     (real flow: this kicks off Shopify OAuth — redirectUrl is Shopify's own auth page; the
 *     actual connected/error result then comes back via an OAuth callback route, not this call
 *     resolving synchronously the way the mock does)
 *
 * C3 — Shopify store connect. No real OAuth app/backend exists yet, so this mock simulates the
 * redirect boundary and webhook-active confirmation without inventing real Shopify credentials.
 * Mock/dev adapter only — no real provider is called.
 *
 * Dev convenience: a store URL containing "fail" (case-insensitive) deterministically resolves
 * to the error state, so the failure/troubleshooting UI is actually reachable and testable
 * without random flakiness. A real adapter has no equivalent — the OAuth callback route reports
 * success/failure on its own.
 */
export const shopifyAdapter: IntegrationAdapter = {
  async getStatus(email) {
    return getOnboardingRecord(email)?.storeConnectionStatus ?? "not_connected";
  },

  async connect(email, input): Promise<IntegrationConnectResult> {
    const storeUrl = input?.storeUrl?.trim() ?? "";
    saveStoreConnectionStatus(email, "connecting");
    await delay(1300);

    if (!storeUrl || storeUrl.toLowerCase().includes("fail")) {
      const error = !storeUrl
        ? "Enter your Shopify store URL to connect."
        : "SellVia couldn't reach that Shopify store. Check the URL and permissions, then try again.";
      saveStoreConnectionStatus(email, "error", error);
      return { status: "error", error };
    }

    saveStoreConnectionStatus(email, "connected");
    return { status: "connected" };
  },
};
