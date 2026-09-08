import type { Flow, Session } from "./ui-flow-types";

export type FlowKind = "login" | "registration" | "recovery" | "verification" | "settings";

/**
 * The mock provider's flow shape — a local stand-in for what was previously `@ory/client`'s own
 * flow types (see ui-flow-types.ts). Only the mock provider produces these now; the real
 * provider is Clerk (lib/auth/clerk/), which doesn't have a "flow" concept at all, so AuthFlowForm
 * (built around this contract) is mock-mode only — see lib/auth/provider.ts and every auth
 * screen's `isMockMode` branch.
 */
export type AnyFlow = Flow;

/**
 * The raw result of a flow submission — deliberately `unknown` rather than a specific shape.
 * It's whichever of several real Kratos response types (SuccessfulNativeLogin,
 * SuccessfulNativeRegistration, RecoveryFlow, VerificationFlow, SettingsFlow — or the mock's
 * equivalent) came back; callers narrow it themselves (checking for `session`/`continue_with`/
 * `ui`), same as AuthFlowForm already does.
 */
export type UpdateFlowResult = unknown;

/**
 * The app-level session shape every screen actually consumes (dashboard, redirect checks).
 * Both providers normalize into this so callers never need to know which one produced it.
 *
 * `onboardingComplete` (Feature 2) — the one deliberate, minimal Feature 1 touch this task
 * makes, explicitly requested: onboarding-complete used to live only in a side-channel cookie
 * (deleted — see lib/onboarding/status.ts's doc comment for the bug that caused), disconnected
 * from the actual session object. It's part of the session now instead.
 * - mock provider: real — sourced from the mock user record (lib/auth/mock/user-store.ts),
 *   set via lib/auth/mock/provider.ts's markOnboardingComplete, included every time a session is
 *   issued (login, registration-verify, TOTP challenge).
 * - clerk mode: real too, but through a different path — Clerk isn't one of the two
 *   AuthProvider implementations below (it has no "flow" concept, see AnyFlow's doc comment), so
 *   it doesn't go through markOnboardingComplete at all. See
 *   lib/auth/clerk/server-session.ts and app/actions/clerk-profile.ts: written to the Clerk
 *   user's publicMetadata via a Server Action (secret-key-authenticated), read back via
 *   currentUser().publicMetadata. `undefined` here (not yet written) is treated as "not
 *   complete" by isOnboardingComplete() — no other fallback.
 */
export interface AppSession {
  id: string;
  email: string;
  verified: boolean;
  roles: string[];
  onboardingComplete?: boolean;
}

/**
 * The seam between "how auth actually works" and every *mock-mode* auth screen — implemented by
 * lib/auth/mock/provider.ts only. Clerk (the real provider — lib/auth/config.ts) isn't a second
 * implementation of this interface: it has no self-service "flow" concept (no createFlow/
 * getFlow/updateFlow equivalent — see AnyFlow's doc comment), so every auth screen branches on
 * `isMockMode` instead and renders a Clerk-specific component (lib/auth/clerk/,
 * components/auth/clerk/) in the real-provider case rather than going through this seam at all.
 */
export interface AuthProvider {
  readonly mode: "mock";

  /** Always true for the mock provider — kept so callers don't need a mock-only special case. */
  isConfigured(): boolean;

  createFlow(kind: FlowKind, returnTo?: string): Promise<AnyFlow>;
  getFlow(kind: FlowKind, id: string): Promise<AnyFlow>;
  updateFlow(kind: FlowKind, flowId: string, body: Record<string, unknown>): Promise<UpdateFlowResult>;

  createLogoutFlow(): Promise<{ logout_token: string }>;
  submitLogout(token: string): Promise<void>;

  /**
   * Side-effect hooks so AuthFlowForm can stay provider-agnostic. The mock provider uses them
   * to persist a plain dev cookie so server components can gate routes the same way they gate
   * against a real Clerk session.
   */
  onAuthenticated(session: Session): Promise<void>;
  onVerified(): Promise<void>;
  onLoggedOut(): Promise<void>;

  /**
   * Feature 2 — marks onboarding complete as part of the actual session/account record
   * (AppSession.onboardingComplete), not a side-channel cookie (deleted — see
   * lib/onboarding/status.ts's doc comment). Real in mock mode: updates the user record and
   * re-issues the session cookie. Clerk mode doesn't call this at all — see
   * markClerkOnboardingComplete in app/actions/clerk-profile.ts and complete-view.tsx's
   * `isMockMode` branch.
   */
  markOnboardingComplete(email: string): Promise<void>;
}
