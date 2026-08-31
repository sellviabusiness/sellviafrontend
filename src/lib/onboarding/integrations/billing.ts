import { getOnboardingRecord, saveBillingStatus } from "../store";
import type { IntegrationAdapter, IntegrationConnectResult } from "./types";
import { delay } from "./types";

/**
 * MOCK DATA LAYER — C2 Switch billing connect.
 *
 * Stands in for:
 *   GET  /merchant/billing/status  → { status: ConnectionStatus }
 *   POST /merchant/billing/connect → { status: ConnectionStatus, redirectUrl?: string, error?: string }
 *     (redirectUrl present = the real Switch flow needs a browser redirect, not an inline widget —
 *     the `IntegrationAdapter` interface in ./types.ts already models this either-shape result)
 *
 * The real Switch integration mechanism (widget vs. redirect) is not finalized, so this mock
 * adapter is the only implementation the billing step (app/onboarding/billing) talks to via the
 * `IntegrationAdapter` interface — swapping in the real Switch widget/redirect later means
 * writing a new file that satisfies this same interface (same two methods, same result shape),
 * not touching the UI. Mock/dev adapter only — no real provider is called.
 */
export const billingAdapter: IntegrationAdapter = {
  async getStatus(email) {
    return getOnboardingRecord(email)?.billingStatus ?? "not_connected";
  },

  async connect(email): Promise<IntegrationConnectResult> {
    saveBillingStatus(email, "connecting");
    await delay(1100);
    saveBillingStatus(email, "connected");
    return { status: "connected" };
  },
};
