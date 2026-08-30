import { isAxiosError } from "axios";
import type { Session } from "@ory/client";
import { oryFrontendClient, isOryConfigured } from "./sdk";
import { AuthRequestError } from "../errors";
import type { AnyFlow, AuthProvider, FlowKind, UpdateFlowResult } from "../types";

/** Runs an SDK call and normalizes a failure into AuthRequestError — see lib/auth/errors.ts. */
async function unwrap<T>(promise: Promise<{ data: T }>): Promise<T> {
  try {
    return (await promise).data;
  } catch (err) {
    if (isAxiosError(err) && err.response) {
      throw new AuthRequestError(err.response.status, err.response.data);
    }
    // No response at all — Kratos unreachable, DNS/CORS failure, etc.
    throw new AuthRequestError(0, undefined);
  }
}

async function createFlow(kind: FlowKind, returnTo?: string): Promise<AnyFlow> {
  switch (kind) {
    case "login":
      return unwrap(oryFrontendClient.createBrowserLoginFlow({ returnTo }));
    case "registration":
      return unwrap(oryFrontendClient.createBrowserRegistrationFlow({ returnTo }));
    case "recovery":
      return unwrap(oryFrontendClient.createBrowserRecoveryFlow({ returnTo }));
    case "verification":
      return unwrap(oryFrontendClient.createBrowserVerificationFlow({ returnTo }));
    case "settings":
      // B5 — was previously "throw, only reachable via the recovery redirect": /account/security
      // needs a settings flow reachable directly, while already logged in, not just post-recovery.
      // createBrowserSettingsFlow is real Kratos SDK, not a mock-only concession — it requires an
      // active session (sent via the browser's own Kratos cookie, same as every other call here);
      // Kratos itself rejects it otherwise, same as it already does for every other flow kind.
      return unwrap(oryFrontendClient.createBrowserSettingsFlow({ returnTo }));
  }
}

async function getFlow(kind: FlowKind, id: string): Promise<AnyFlow> {
  switch (kind) {
    case "login":
      return unwrap(oryFrontendClient.getLoginFlow({ id }));
    case "registration":
      return unwrap(oryFrontendClient.getRegistrationFlow({ id }));
    case "recovery":
      return unwrap(oryFrontendClient.getRecoveryFlow({ id }));
    case "verification":
      return unwrap(oryFrontendClient.getVerificationFlow({ id }));
    case "settings":
      return unwrap(oryFrontendClient.getSettingsFlow({ id }));
  }
}

async function updateFlow(
  kind: FlowKind,
  flowId: string,
  body: Record<string, unknown>,
): Promise<UpdateFlowResult> {
  switch (kind) {
    case "login":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic, node-driven body
      return unwrap(oryFrontendClient.updateLoginFlow({ flow: flowId, updateLoginFlowBody: body as any }));
    case "registration":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return unwrap(oryFrontendClient.updateRegistrationFlow({ flow: flowId, updateRegistrationFlowBody: body as any }));
    case "recovery":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return unwrap(oryFrontendClient.updateRecoveryFlow({ flow: flowId, updateRecoveryFlowBody: body as any }));
    case "verification":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return unwrap(oryFrontendClient.updateVerificationFlow({ flow: flowId, updateVerificationFlowBody: body as any }));
    case "settings":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return unwrap(oryFrontendClient.updateSettingsFlow({ flow: flowId, updateSettingsFlowBody: body as any }));
  }
}

/**
 * Real Ory Kratos, called directly from the browser. Session persistence/logout is entirely
 * Kratos's own cookie (Set-Cookie on the XHR response) — the three hooks below are deliberate
 * no-ops here; only the mock provider needs them.
 */
export const kratosProvider: AuthProvider = {
  mode: "kratos",
  isConfigured: () => isOryConfigured,
  createFlow,
  getFlow,
  updateFlow,
  async createLogoutFlow() {
    return unwrap(oryFrontendClient.createBrowserLogoutFlow());
  },
  async submitLogout(token: string) {
    await unwrap(oryFrontendClient.updateLogoutFlow({ token }));
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- interface-mandated param, unused here
  async onAuthenticated(session: Session) {},
  async onVerified() {},
  async onLoggedOut() {},

  // Feature 2 — no-op by design, see types.ts's AuthProvider doc comment for both: no confirmed
  // Kratos trait/write path for role or onboarding-completion state without the real identity
  // schema. lib/onboarding/status.ts's cookie fallback and steps.ts's getEffectiveRoles
  // precedence are what keep kratos mode functional despite these being no-ops.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- interface-mandated params, unused here
  async updateRoles(email: string, roles: string[]) {},
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- interface-mandated param, unused here
  async markOnboardingComplete(email: string) {},
};
