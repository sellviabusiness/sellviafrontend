import type { AnyFlow, AuthProvider, FlowKind, UpdateFlowResult } from "../types";
import type { Identity, Session, UiContainer } from "@ory/client";
import { AuthRequestError } from "../errors";
import { hiddenNode, inputNode, submitNode, textNode, uiText, withFieldError, withValues } from "./nodes";
import * as userStore from "./user-store";
import {
  clearMockSessionCookie,
  readMockSessionCookieClient,
  setMockSessionCookie,
} from "./session-cookie";

/**
 * MOCK DATA LAYER — the AuthProvider implementation for the whole Authentication feature.
 *
 * Stands in for: Ory Kratos's self-service flow REST API in full — `POST/GET
 * /self-service/{login,registration,recovery,verification,settings}/{browser,flows}` and their
 * `PUT .../updates`, plus `GET /sessions/whoami` and `POST /self-service/logout`. Every method on
 * this object mirrors one real Kratos SDK call 1:1 (see `AuthProvider` in lib/auth/types.ts —
 * that interface IS the contract; lib/auth/kratos/provider.ts is the real implementation of the
 * exact same interface, already built, already wired, a pure env-var swap away). No new contract
 * design needed at handoff time — Kratos's own API is the target, already documented via
 * `@ory/client`.
 *
 * DEV-ONLY MOCK PROVIDER — no network, no real backend. Simulates Ory Kratos's self-service
 * flow contract closely enough (same node/state shapes) that AuthFlowForm, which was written
 * against that contract, renders and submits against this identically to the real thing. See
 * Docs/Frontend/Playbooks/01-authentication.md and the chat response accompanying this build
 * for what is/isn't simulated.
 *
 * Demo credentials (seeded, always available): demo@sellvia.test / password123
 * Recovery/verification code (fixed, always accepted): 123456
 */

const RECOVERY_VERIFICATION_CODE = "123456";
const MIN_PASSWORD_LENGTH = 8; // mock-only rule — the real policy lives in Kratos, not here

// B5 — fixed code, same reasoning as RECOVERY_VERIFICATION_CODE: no real TOTP math needed to
// exercise the enrollment/challenge UI. Distinct value from the recovery code purely so testing
// can tell at a glance which step it's in.
const MFA_ENROLL_CODE = "654321";

// B4 — how long a sent recovery/verification code stays valid before a submission is treated as
// genuinely expired (410, routes through AuthFlowForm's "expired" path + restart button) rather
// than "incorrect" (400, inline field error, form stays up). 10 min — a normal-feeling window for
// manual testing, not tuned against any documented policy (Password Policy doc has no
// re-platformed-on-Kratos numeric rule for this either — see the audit).
const CODE_TTL_MS = 10 * 60 * 1000;

function delay(ms = 500) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function newId(): string {
  return `mock-flow-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

interface FlowRecord {
  kind: FlowKind;
  flow: AnyFlow;
  email?: string;
  /** When the current code was (re)sent — recovery/verification's code step, B4's expiry check. */
  codeSentAt?: number;
}

const flows = new Map<string, FlowRecord>();

function baseFields(id: string, state: string) {
  const now = new Date().toISOString();
  return {
    id,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    issued_at: now,
    request_url: "",
    state,
    type: "browser",
  };
}

function container(nodes: UiContainer["nodes"], messages: UiContainer["messages"] = []): UiContainer {
  return { action: "#", method: "POST", nodes, messages };
}

function fakeIdentity(email: string, roles: string[], verified: boolean): Identity {
  return {
    id: `mock-identity-${email}`,
    schema_id: "default",
    schema_url: "",
    traits: { email, roles },
    verifiable_addresses: [
      { value: email, verified, via: "email", status: verified ? "completed" : "sent" } as never,
    ],
  };
}

function fakeSession(email: string, roles: string[], verified: boolean): Session {
  return { id: `mock-session-${email}`, identity: fakeIdentity(email, roles, verified) };
}

// ---- node builders per kind/step -------------------------------------------------------

function loginNodes(): UiContainer["nodes"] {
  return [
    hiddenNode("csrf_token", "mock-csrf-token"),
    inputNode({ name: "identifier", type: "email", label: "Email", required: true, autoComplete: "email" }),
    inputNode({
      name: "password",
      type: "password",
      group: "password",
      label: "Password",
      required: true,
      autoComplete: "current-password",
    }),
    submitNode({ value: "password", label: "Log in", group: "password" }),
  ];
}

function registrationNodes(): UiContainer["nodes"] {
  return [
    hiddenNode("csrf_token", "mock-csrf-token"),
    inputNode({
      name: "traits.email",
      type: "email",
      label: "Email",
      required: true,
      autoComplete: "email",
    }),
    inputNode({
      name: "password",
      type: "password",
      group: "password",
      label: "Password",
      required: true,
      autoComplete: "new-password",
    }),
    submitNode({ value: "password", label: "Create account", group: "password" }),
  ];
}

function emailStepNodes(submitLabel: string): UiContainer["nodes"] {
  return [
    hiddenNode("csrf_token", "mock-csrf-token"),
    inputNode({ name: "email", type: "email", label: "Email", required: true, autoComplete: "email" }),
    submitNode({ value: "code", label: submitLabel, group: "code" }),
  ];
}

function codeStepNodes(): UiContainer["nodes"] {
  return [
    hiddenNode("csrf_token", "mock-csrf-token"),
    inputNode({
      name: "code",
      type: "text",
      label: "Verification code",
      required: true,
      autoComplete: "one-time-code",
    }),
    submitNode({ value: "code", label: "Verify code", group: "code" }),
    submitNode({ value: "resend", label: "Resend email", group: "code" }),
  ];
}

// B1 — AAL2 challenge step, shown by updateLogin below once the first factor passes for an
// mfaEnabled user. Same node shape as any other step (input + submit) so AuthFlowForm's existing
// generic renderer needs no changes to show it — it just re-renders whatever flow comes back.
function secondFactorNodes(): UiContainer["nodes"] {
  return [
    hiddenNode("csrf_token", "mock-csrf-token"),
    inputNode({
      name: "totp_code",
      type: "text",
      group: "totp",
      label: "Authentication code",
      required: true,
      autoComplete: "one-time-code",
    }),
    submitNode({ value: "totp", label: "Verify", group: "totp" }),
  ];
}

// B5 — password change (unchanged) plus a TOTP section whose shape depends on whether this
// account already has it on. Both live in the same settings flow/form, distinguished by which
// submit button was clicked (`method`) — the same multi-submit-button pattern the code step
// already uses for "verify" vs "resend".
function settingsNodes(mfaEnabled: boolean): UiContainer["nodes"] {
  const passwordNodes: UiContainer["nodes"] = [
    inputNode({
      name: "password",
      type: "password",
      group: "password",
      label: "New password",
      required: true,
      autoComplete: "new-password",
    }),
    submitNode({ value: "password", label: "Change password", group: "password" }),
  ];

  const totpNodes: UiContainer["nodes"] = mfaEnabled
    ? [
        textNode("Two-factor authentication is on for this account.", "totp"),
        submitNode({ value: "totp_disable", label: "Turn off two-factor authentication", group: "totp" }),
      ]
    : [
        textNode(
          `Scan this in your authenticator app, or enter it manually: MOCK-TOTP-SECRET-DEMO123. (Mock: confirm with ${MFA_ENROLL_CODE}.)`,
          "totp",
        ),
        inputNode({
          name: "totp_code",
          type: "text",
          group: "totp",
          label: "6-digit code",
          required: true,
          autoComplete: "one-time-code",
        }),
        submitNode({ value: "totp_enable", label: "Turn on two-factor authentication", group: "totp" }),
      ];

  return [hiddenNode("csrf_token", "mock-csrf-token"), ...passwordNodes, ...totpNodes];
}

// ---- create / get -----------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for interface parity with the real provider
async function createFlow(kind: FlowKind, returnTo?: string): Promise<AnyFlow> {
  await delay();

  if (kind === "settings") {
    // Unlike the real Kratos provider (createBrowserSettingsFlow needs a privileged session
    // Kratos itself validates server-side), the mock's only "session" is the client-trusted
    // cookie — good enough here since this runs client-side anyway (AuthFlowForm calls
    // authProvider.* directly, no API route in between). B5 needs this path so /account/security
    // is reachable directly while already logged in, not just via the recovery hand-off (which
    // is the only way createFlow("settings") worked before this task).
    const session = readMockSessionCookieClient();
    if (!session) throw new AuthRequestError(401, undefined);
    const user = userStore.findUser(session.email);
    const id = newId();
    const flow = {
      ...baseFields(id, "show_form"),
      identity: fakeIdentity(session.email, session.roles, session.verified),
      ui: container(settingsNodes(user?.mfaEnabled ?? false)),
    } as AnyFlow;
    flows.set(id, { kind: "settings", flow, email: session.email });
    return flow;
  }

  const id = newId();
  const nodes =
    kind === "login"
      ? loginNodes()
      : kind === "registration"
        ? registrationNodes()
        : kind === "recovery"
          ? emailStepNodes("Send reset link")
          : emailStepNodes("Send verification link");

  const flow = { ...baseFields(id, "choose_method"), ui: container(nodes) } as AnyFlow;
  flows.set(id, { kind, flow });
  return flow;
}

async function getFlow(kind: FlowKind, id: string): Promise<AnyFlow> {
  await delay(200);
  const record = flows.get(id);
  if (!record || record.kind !== kind) {
    throw new AuthRequestError(410, undefined);
  }
  return record.flow;
}

// ---- update per kind --------------------------------------------------------------------

async function updateFlow(
  kind: FlowKind,
  flowId: string,
  body: Record<string, unknown>,
): Promise<UpdateFlowResult> {
  await delay();

  const record = flows.get(flowId);
  if (!record || record.kind !== kind) {
    throw new AuthRequestError(410, undefined);
  }

  switch (kind) {
    case "login":
      return updateLogin(record, body);
    case "registration":
      return updateRegistration(record, body);
    case "recovery":
      return updateRecoveryOrVerification(record, body, "recovery");
    case "verification":
      return updateRecoveryOrVerification(record, body, "verification");
    case "settings":
      return updateSettings(record, body);
  }
}

function updateLogin(record: FlowRecord, body: Record<string, unknown>): UpdateFlowResult {
  // B1 — second step of an AAL2 challenge: same flow id, new state, set by the first-factor
  // branch below the first time an mfaEnabled account logs in. Checked first so a resubmission
  // of this step doesn't fall through and get treated as a fresh identifier/password attempt.
  if (record.flow.state === "choose_second_factor") {
    const code = typeof body.totp_code === "string" ? body.totp_code : "";
    if (!code) {
      const nodes = withFieldError(secondFactorNodes(), "totp_code", "This field is required.");
      throw new AuthRequestError(400, { ...record.flow, ui: container(nodes) });
    }
    if (code !== MFA_ENROLL_CODE) {
      const nodes = withFieldError(secondFactorNodes(), "totp_code", "That code is incorrect.");
      throw new AuthRequestError(400, { ...record.flow, ui: container(nodes) });
    }
    const user = userStore.findUser(record.email ?? "");
    flows.delete(record.flow.id);
    return {
      session: fakeSession(record.email ?? "", user?.roles ?? [], user?.verified ?? true),
      continue_with: [],
    };
  }

  const identifier = typeof body.identifier === "string" ? body.identifier : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!identifier || !password) {
    let nodes = withValues(loginNodes(), body);
    if (!identifier) nodes = withFieldError(nodes, "identifier", "This field is required.");
    if (!password) nodes = withFieldError(nodes, "password", "This field is required.");
    const flow = { ...record.flow, ui: container(nodes) };
    throw new AuthRequestError(400, flow);
  }

  const user = userStore.findUser(identifier);
  if (!user || user.password !== password) {
    const nodes = withValues(loginNodes(), body);
    const flow = {
      ...record.flow,
      ui: container(nodes, [uiText("The email or password you entered is incorrect.", "error")]),
    };
    throw new AuthRequestError(400, flow);
  }

  // B1 — first factor passed. If this account has TOTP on, don't hand back a session yet:
  // re-render the SAME flow id with the AAL2 challenge instead. AuthFlowForm already knows how
  // to render "an updated flow that isn't a session" generically (recovery/verification's
  // multi-step handling is the same mechanism) — nothing there needed to change for this to work.
  if (user.mfaEnabled) {
    record.email = user.email;
    const updated = {
      ...record.flow,
      state: "choose_second_factor",
      ui: container(secondFactorNodes(), [uiText("Enter the 6-digit code from your authenticator app.", "info")]),
    };
    record.flow = updated;
    return updated;
  }

  flows.delete(record.flow.id);
  return { session: fakeSession(user.email, user.roles, user.verified), continue_with: [] };
}

function updateRegistration(record: FlowRecord, body: Record<string, unknown>): UpdateFlowResult {
  const traits = (body.traits ?? {}) as Record<string, unknown>;
  const email = typeof traits.email === "string" ? traits.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  const rolesRaw = traits.roles;
  const roles = Array.isArray(rolesRaw) ? rolesRaw.map(String) : rolesRaw ? [String(rolesRaw)] : [];

  const fail = (fieldName: string, message: string): never => {
    const nodes = withFieldError(withValues(registrationNodes(), { "traits.email": email }), fieldName, message);
    throw new AuthRequestError(400, { ...record.flow, ui: container(nodes) });
  };

  if (!email) fail("traits.email", "This field is required.");
  if (!password) fail("password", "This field is required.");
  if (password.length < MIN_PASSWORD_LENGTH) {
    fail("password", `Password must be at least ${MIN_PASSWORD_LENGTH} characters. (Mock rule — the real policy is enforced by Kratos.)`);
  }
  if (userStore.findUser(email)) {
    fail("traits.email", "An account with this email already exists.");
  }

  userStore.createUser(email, password, roles);
  flows.delete(record.flow.id);

  // Registration always routes to email verification in the mock, so that path is reachable
  // and testable every time — matches Docs/Scratch/SCREEN_INVENTORY.md's Verify Email screen.
  const verificationId = newId();
  const verificationFlow = {
    ...baseFields(verificationId, "choose_method"),
    ui: container(withValues(emailStepNodes("Send verification link"), { email })),
  } as AnyFlow;
  flows.set(verificationId, { kind: "verification", flow: verificationFlow, email });

  return { continue_with: [{ action: "show_verification_ui", flow: { id: verificationId } }] };
}

function updateRecoveryOrVerification(
  record: FlowRecord,
  body: Record<string, unknown>,
  kind: "recovery" | "verification",
): UpdateFlowResult {
  const state = record.flow.state as string;

  if (state === "choose_method") {
    const email = typeof body.email === "string" ? body.email : "";
    if (!email) {
      const nodes = withFieldError(emailStepNodes(kind === "recovery" ? "Send reset link" : "Send verification link"), "email", "This field is required.");
      throw new AuthRequestError(400, { ...record.flow, ui: container(nodes) });
    }

    record.email = email;
    record.codeSentAt = Date.now();
    const updated = {
      ...record.flow,
      state: "sent_email",
      ui: container(
        codeStepNodes(),
        [uiText(`If that address is on file, a code has been sent. (Mock: use ${RECOVERY_VERIFICATION_CODE}.)`, "info")],
      ),
    };
    record.flow = updated;
    return updated;
  }

  // state === "sent_email": either resending, or verifying the code
  const method = typeof body.method === "string" ? body.method : "code";
  if (method === "resend") {
    record.codeSentAt = Date.now();
    const updated = {
      ...record.flow,
      ui: container(
        codeStepNodes(),
        [uiText(`A new code has been sent. (Mock: use ${RECOVERY_VERIFICATION_CODE}.)`, "info")],
      ),
    };
    record.flow = updated;
    return updated;
  }

  // B4 — a real elapsed-time check, not the same bucket as a mistyped code: this throws 410
  // (no flow in the error body), which routes through classifyAuthError's existing "expired"
  // path — AuthFlowForm shows that with a "Request a new one" action (see auth-flow-form.tsx),
  // distinct from the plain inline field error a wrong-but-recent code gets below.
  const codeAge = record.codeSentAt ? Date.now() - record.codeSentAt : Infinity;
  if (codeAge > CODE_TTL_MS) {
    flows.delete(record.flow.id);
    throw new AuthRequestError(410, undefined);
  }

  const code = typeof body.code === "string" ? body.code : "";
  if (code !== RECOVERY_VERIFICATION_CODE) {
    const nodes = withFieldError(codeStepNodes(), "code", "That code is incorrect.");
    throw new AuthRequestError(400, { ...record.flow, ui: container(nodes) });
  }

  flows.delete(record.flow.id);

  if (kind === "verification") {
    if (record.email) {
      userStore.markVerified(record.email);
      // Establish the session directly here rather than relying solely on onVerified() (which
      // only flips an *existing* cookie's verified flag) — a fresh register -> verify chain has
      // no session cookie yet at all, and Feature 2's onboarding (and "Continue to dashboard")
      // needs one to actually work.
      const user = userStore.findUser(record.email);
      if (user) {
        setMockSessionCookie({
          id: user.id,
          email: user.email,
          verified: true,
          roles: user.roles,
          onboardingComplete: user.onboardingComplete,
        });
      }
    }
    const passed = { ...record.flow, state: "passed_challenge", ui: container([]) };
    return passed;
  }

  // recovery success -> hand off to a privileged settings flow, same as real Kratos would.
  const settingsId = newId();
  const mfaEnabled = userStore.findUser(record.email ?? "")?.mfaEnabled ?? false;
  const identity = fakeIdentity(record.email ?? "", userStore.findUser(record.email ?? "")?.roles ?? [], true);
  const settingsFlow = {
    ...baseFields(settingsId, "show_form"),
    identity,
    ui: container(settingsNodes(mfaEnabled)),
  } as AnyFlow;
  flows.set(settingsId, { kind: "settings", flow: settingsFlow, email: record.email });

  return { continue_with: [{ action: "show_settings_ui", flow: { id: settingsId } }] };
}

function updateSettings(record: FlowRecord, body: Record<string, unknown>): UpdateFlowResult {
  const method = typeof body.method === "string" ? body.method : "password";
  const email = record.email ?? "";
  const currentMfaEnabled = userStore.findUser(email)?.mfaEnabled ?? false;

  // B5 — TOTP enrollment. Two submit buttons live in the same form as the password field
  // (settingsNodes above), distinguished by which one was clicked, same pattern the recovery/
  // verification code step already uses for "verify" vs "resend".
  if (method === "totp_enable") {
    const code = typeof body.totp_code === "string" ? body.totp_code : "";
    if (!code) {
      const nodes = withFieldError(settingsNodes(false), "totp_code", "This field is required.");
      throw new AuthRequestError(400, { ...record.flow, ui: container(nodes) });
    }
    if (code !== MFA_ENROLL_CODE) {
      const nodes = withFieldError(settingsNodes(false), "totp_code", "That code is incorrect.");
      throw new AuthRequestError(400, { ...record.flow, ui: container(nodes) });
    }
    if (email) userStore.setMfaEnabled(email, true);
    const updated = {
      ...record.flow,
      ui: container(settingsNodes(true), [uiText("Two-factor authentication is now on.", "success")]),
    };
    record.flow = updated;
    return updated;
  }

  if (method === "totp_disable") {
    if (email) userStore.setMfaEnabled(email, false);
    const updated = {
      ...record.flow,
      ui: container(settingsNodes(false), [uiText("Two-factor authentication is now off.", "success")]),
    };
    record.flow = updated;
    return updated;
  }

  // password change (existing behavior)
  const password = typeof body.password === "string" ? body.password : "";

  if (!password) {
    const nodes = withFieldError(settingsNodes(currentMfaEnabled), "password", "This field is required.");
    throw new AuthRequestError(400, { ...record.flow, ui: container(nodes) });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    const nodes = withFieldError(
      settingsNodes(currentMfaEnabled),
      "password",
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters. (Mock rule.)`,
    );
    throw new AuthRequestError(400, { ...record.flow, ui: container(nodes) });
  }

  if (email) userStore.setPassword(email, password);
  const updated = { ...record.flow, state: "success", ui: container([], [uiText("Your password has been updated.", "success")]) };
  record.flow = updated;
  return updated;
}

// ---- provider -----------------------------------------------------------------------------

export const mockProvider: AuthProvider = {
  mode: "mock",
  isConfigured: () => true,
  createFlow,
  getFlow,
  updateFlow,

  async createLogoutFlow() {
    await delay(150);
    return { logout_token: "mock-logout-token" };
  },
  async submitLogout() {
    await delay(150);
  },

  async onAuthenticated(session: Session) {
    const traits = (session.identity?.traits ?? {}) as Record<string, unknown>;
    const email =
      session.identity?.verifiable_addresses?.[0]?.value ??
      (typeof traits.email === "string" ? traits.email : "");
    // Feature 2 — onboardingComplete comes from the account record, not the (Ory-shaped) fake
    // session object login/the-TOTP-step construct; this is the one funnel point every
    // login/challenge-success path already goes through, so it's read fresh here rather than
    // threaded through fakeSession's own signature.
    const user = userStore.findUser(email);
    setMockSessionCookie({
      id: session.identity?.id ?? session.id,
      email,
      verified: session.identity?.verifiable_addresses?.[0]?.verified ?? false,
      roles: Array.isArray(traits.roles) ? (traits.roles as string[]) : [],
      onboardingComplete: user?.onboardingComplete ?? false,
    });
  },
  async onVerified() {
    const current = readMockSessionCookieClient();
    if (current) setMockSessionCookie({ ...current, verified: true });
  },
  async onLoggedOut() {
    clearMockSessionCookie();
  },

  async updateRoles(email: string, roles: string[]) {
    userStore.setRoles(email, roles);
    const user = userStore.findUser(email);
    if (user) {
      setMockSessionCookie({
        id: user.id,
        email: user.email,
        verified: user.verified,
        roles: user.roles,
        onboardingComplete: user.onboardingComplete,
      });
    }
  },
  async markOnboardingComplete(email: string) {
    userStore.setOnboardingComplete(email, true);
    const user = userStore.findUser(email);
    if (user) {
      setMockSessionCookie({
        id: user.id,
        email: user.email,
        verified: user.verified,
        roles: user.roles,
        onboardingComplete: true,
      });
    }
  },
};
