import type {
  LoginFlow,
  RegistrationFlow,
  RecoveryFlow,
  VerificationFlow,
  SettingsFlow,
  Session,
} from "@ory/client";

export type FlowKind = "login" | "registration" | "recovery" | "verification" | "settings";

/**
 * We reuse @ory/client's own flow types as the shared contract between providers — they're
 * plain data shapes (id + ui.nodes + state), not axios-coupled. Both the real Kratos provider
 * and the mock provider return objects shaped like this, which is what lets AuthFlowForm render
 * either one identically without knowing which is behind it.
 */
export type AnyFlow = LoginFlow | RegistrationFlow | RecoveryFlow | VerificationFlow | SettingsFlow;

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
 * (lib/onboarding/status-cookie.ts), disconnected from the actual session object. It's part of
 * the session now instead.
 * - mock provider: real — sourced from the mock user record (lib/auth/mock/user-store.ts),
 *   set via lib/auth/mock/provider.ts's markOnboardingComplete, included every time a session is
 *   issued (login, registration-verify, TOTP challenge).
 * - kratos provider: best-effort only — reads `traits.onboardingComplete` if a real identity
 *   schema happens to carry it, defaults to `undefined` otherwise. There's no write path for it
 *   in kratos mode (would need a `profile`-group settings submission whose real node shape isn't
 *   knowable without the Kratos identity schema — same class of unverified-contract gap as
 *   `traits.roles` in role-selector.tsx). `isOnboardingComplete()` (lib/onboarding/status.ts)
 *   falls back to the pre-existing cookie specifically when this is `undefined`, so kratos mode
 *   keeps working, just not fully session-native yet. Flagged, not silently patched over.
 */
export interface AppSession {
  id: string;
  email: string;
  verified: boolean;
  roles: string[];
  onboardingComplete?: boolean;
}

/**
 * The seam between "how auth actually works" and every screen in this feature. Implemented by
 * lib/auth/kratos/provider.ts (real Ory Kratos) and lib/auth/mock/provider.ts (local, no
 * backend). Swapping providers is a single env var (lib/auth/config.ts) — nothing that imports
 * `authProvider` (lib/auth/provider.ts) needs to change.
 */
export interface AuthProvider {
  readonly mode: "mock" | "kratos";

  /** False only for the Kratos provider when NEXT_PUBLIC_ORY_KRATOS_URL isn't set. */
  isConfigured(): boolean;

  createFlow(kind: FlowKind, returnTo?: string): Promise<AnyFlow>;
  getFlow(kind: FlowKind, id: string): Promise<AnyFlow>;
  updateFlow(kind: FlowKind, flowId: string, body: Record<string, unknown>): Promise<UpdateFlowResult>;

  createLogoutFlow(): Promise<{ logout_token: string }>;
  submitLogout(token: string): Promise<void>;

  /**
   * Side-effect hooks so AuthFlowForm can stay provider-agnostic. The Kratos provider no-ops
   * all three (a real Kratos session cookie is already set by the browser via Set-Cookie on the
   * XHR response). The mock provider uses them to persist a plain dev cookie so server
   * components can gate routes the same way they will against a real session later.
   */
  onAuthenticated(session: Session): Promise<void>;
  onVerified(): Promise<void>;
  onLoggedOut(): Promise<void>;

  /**
   * Feature 2 (C1) — the role confirm/adjust step calls this instead of reaching into either
   * provider's internals directly, so an actual role CHANGE (not just a confirm-as-is) updates
   * the live session too, not only onboarding's own bookkeeping.
   * - mock: real — updates the user record and re-issues the session cookie with the new roles.
   * - kratos: no-op. There's no verified write path for `traits.roles` without the real identity
   *   schema (same unverified-contract class as role-selector.tsx's own flagged assumption).
   *   Onboarding's own step sequencing still branches off the adjusted roles correctly either
   *   way (getEffectiveRoles prefers the onboarding record once this step has been touched) —
   *   only the raw session.roles a kratos-mode /dashboard or proxy.ts check would see stays
   *   stale until next login. Flagged, not silently worked around.
   */
  updateRoles(email: string, roles: string[]): Promise<void>;

  /**
   * Feature 2 — marks onboarding complete as part of the actual session/account record
   * (AppSession.onboardingComplete), not only the pre-existing side-channel cookie
   * (lib/onboarding/status-cookie.ts).
   * - mock: real — updates the user record and re-issues the session cookie.
   * - kratos: no-op, same reasoning as updateRoles above (no confirmed trait/write path).
   *   lib/onboarding/status.ts falls back to the cookie specifically when this wasn't set,
   *   so kratos mode keeps working, just not fully session-native yet.
   */
  markOnboardingComplete(email: string): Promise<void>;
}
