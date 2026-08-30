import { AxiosError } from "axios"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { isMockAuth } from "./mock/config"

// "settings" added for B3/B5: Kratos's recovery flow doesn't collect a new
// password itself — after passed_challenge it hands the browser to the
// settings flow (a privileged, already-authenticated flow covering password
// change, MFA/credential enrollment, and profile traits together, grouped
// by ui.node `group`). Confirmed via @ory/client's real types
// (RecoveryFlowState, FrontendApi.createBrowserSettingsFlow/getSettingsFlow
// all exist), not guessed.
export type FlowKind = "login" | "registration" | "recovery" | "verification" | "settings"

/** Same-origin path (proxied to Kratos — see next.config.ts) that starts a fresh browser flow. */
export function browserFlowUrl(kind: FlowKind, returnTo?: string): string {
  const base = isMockAuth() ? "/api/mock-kratos" : "/api/.ory"
  const url = `${base}/self-service/${kind}/browser`
  return returnTo ? `${url}?return_to=${encodeURIComponent(returnTo)}` : url
}

/** Sends the browser to start a new flow — Kratos sets the flow cookie and redirects back with ?flow=<id>. */
export function restartFlow(kind: FlowKind, returnTo?: string): never {
  redirect(browserFlowUrl(kind, returnTo))
}

export async function requestCookie(): Promise<string | undefined> {
  return (await headers()).get("cookie") ?? undefined
}

/** True for the statuses Kratos returns on an expired, already-used, or otherwise dead flow. */
export function isDeadFlowError(error: unknown): boolean {
  if (!(error instanceof AxiosError)) return false
  const status = error.response?.status
  return status === 410 || status === 403 || status === 400
}
