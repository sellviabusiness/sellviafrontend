import { getOnboardingRecord, savePayoutStatus } from "../store";
import type { IntegrationAdapter, IntegrationConnectResult } from "./types";
import { delay } from "./types";

/**
 * MOCK DATA LAYER — C4 Switch payout setup activation.
 *
 * Stands in for:
 *   GET  /creator/payout/status  → { status: ConnectionStatus }
 *   POST /creator/payout/connect → { status: ConnectionStatus, redirectUrl?: string, error?: string }
 *
 * Distinct from saving the payout *form* (lib/onboarding/store.ts's savePayout, its own PATCH
 * /onboarding/payout) — this is the "provider confirmed the payout method is usable" signal
 * that lib/onboarding/payout-gate.ts reads to decide whether a creator's links are activated.
 * Mock/dev adapter only — dummy payout setup, no real Bank/JazzCash/EasyPaisa processor is
 * called.
 */
export const payoutProviderAdapter: IntegrationAdapter = {
  async getStatus(email) {
    return getOnboardingRecord(email)?.payoutStatus ?? "not_connected";
  },

  async connect(email): Promise<IntegrationConnectResult> {
    savePayoutStatus(email, "connecting");
    await delay(900);
    savePayoutStatus(email, "connected");
    return { status: "connected" };
  },
};
