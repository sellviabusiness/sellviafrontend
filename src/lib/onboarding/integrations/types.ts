import type { ConnectionStatus } from "../types";

/**
 * The swappable boundary every C2/C3/C4 integration point talks to. None of the three exact
 * real mechanisms are finalized yet (Switch billing widget-vs-redirect, Shopify OAuth, Switch
 * payout provider) — so the UI never calls a concrete SDK directly. It calls this interface;
 * swapping the mock implementation below for a real one later is a one-file change per
 * integration, with zero changes to the step views that consume it.
 *
 * `redirectUrl` present on the result is the deliberate "this needs a redirect, not just a
 * widget" signal (spec: "do not hardcode to widget or redirect") — a real adapter can return
 * either shape and the UI already branches on presence/absence of this field.
 */
export interface IntegrationConnectResult {
  status: ConnectionStatus;
  redirectUrl?: string;
  error?: string;
}

export interface IntegrationAdapter {
  /** Current status for this account, e.g. on step re-entry. Mock adapters read it back from
   *  the onboarding record itself (lib/onboarding/store.ts) since there's no real backend of
   *  record yet. */
  getStatus(email: string): Promise<ConnectionStatus>;
  /** Kick off (or simulate) a connection attempt. Resolves once the mock "provider" has decided
   *  connected/error — a real adapter would instead resolve immediately with a redirectUrl and
   *  let the OAuth callback route report the final status. */
  connect(email: string, input?: Record<string, string>): Promise<IntegrationConnectResult>;
}

/** Shared timing/labeling for every mock adapter below — kept in one place so "is this REAL or
 *  a dev stand-in" is never ambiguous to a future reader. */
export const MOCK_ADAPTER_LABEL = "Mock / dev adapter — no real provider is called.";

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
