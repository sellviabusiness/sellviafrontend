import type { UiContainer, UiNode, Session } from "@ory/client"

import type { FlowKind } from "../flows"
import { mockStore, newId, MOCK_CODE, type MockFlowState, type MockUser } from "./store"
import { hiddenNode, inputNode, submitNode, textNode, withFieldError } from "./nodes"

export type MockFlow = { id: string; ui: UiContainer }

// Same page routes as the real ones (login/registration/recovery/verification
// route names match FlowKind exactly in this repo) — the POST handler
// redirects back here with the same ?flow= id after mutating state, mirroring
// Kratos's own "browser flow" round trip (POST -> 303 -> GET re-renders the
// flow, errors and all, from what the identity server has stored against
// that flow id). "settings" is the one exception — this repo's settings page
// already lives at /account/security (src/app/account/security/page.tsx),
// not /settings.
function pagePath(kind: FlowKind): string {
  return kind === "settings" ? "/account/security" : `/${kind}`
}

function actionUrl(kind: FlowKind, id: string): string {
  return `/api/mock-kratos/self-service/${kind}?flow=${id}`
}

function csrf(): UiNode {
  return hiddenNode("csrf_token", "mock-csrf-token")
}

function findUser(email: string): MockUser | undefined {
  return mockStore.users.get(email.toLowerCase())
}

function userById(id: string | undefined): MockUser | undefined {
  if (!id) return undefined
  for (const u of mockStore.users.values()) if (u.id === id) return u
  return undefined
}

function loginUi(id: string, step: MockFlowState["step"], email?: string): UiContainer {
  if (step === "totp") {
    return {
      action: actionUrl("login", id),
      method: "POST",
      nodes: [
        csrf(),
        textNode(`Enter the 6-digit code from your authenticator app. (Mock mode — use ${MOCK_CODE}.)`),
        inputNode({ name: "totp_code", type: "text", label: "Authentication code", required: true, group: "totp" }),
        submitNode({ name: "method", value: "totp", label: "Verify", group: "totp" }),
      ],
      messages: [],
    }
  }
  return {
    action: actionUrl("login", id),
    method: "POST",
    nodes: [
      csrf(),
      inputNode({ name: "identifier", type: "email", label: "Email", required: true, value: email, autoComplete: "email" }),
      inputNode({ name: "password", type: "password", label: "Password", required: true, autoComplete: "current-password" }),
      submitNode({ name: "method", value: "password", label: "Log in" }),
    ],
    messages: [],
  }
}

function registrationUi(id: string): UiContainer {
  return {
    action: actionUrl("registration", id),
    method: "POST",
    nodes: [
      csrf(),
      inputNode({ name: "traits.email", type: "email", label: "Email", required: true, autoComplete: "email" }),
      inputNode({ name: "password", type: "password", label: "Password", required: true, autoComplete: "new-password" }),
      // Rendered via flow-form.tsx's options-aware branch (a native
      // <select>) — the concrete "if the schema has a roles trait" case
      // that file's own comment calls out; the mock schema does define one,
      // so that code path is actually exercised here, not just theoretical.
      inputNode({
        name: "traits.roles",
        type: "text",
        label: "I want to join as",
        required: true,
        options: [{ value: "merchant" }, { value: "creator" }],
      }),
      submitNode({ name: "method", value: "password", label: "Create account" }),
    ],
    messages: [],
  }
}

function recoveryUi(id: string, step: MockFlowState["step"], email?: string): UiContainer {
  if (step === "code") {
    return {
      action: actionUrl("recovery", id),
      method: "POST",
      nodes: [
        csrf(),
        textNode(`We sent a code to ${email}. (Mock mode — no real email; use ${MOCK_CODE}.)`),
        inputNode({ name: "code", type: "text", label: "Recovery code", required: true }),
        submitNode({ name: "method", value: "code", label: "Verify code" }),
      ],
      messages: [],
    }
  }
  return {
    action: actionUrl("recovery", id),
    method: "POST",
    nodes: [
      csrf(),
      inputNode({ name: "email", type: "email", label: "Email", required: true, autoComplete: "email" }),
      submitNode({ name: "method", value: "code", label: "Send recovery code" }),
    ],
    messages: [],
  }
}

function verificationUi(id: string, step: MockFlowState["step"], email?: string): UiContainer {
  if (step === "code") {
    return {
      action: actionUrl("verification", id),
      method: "POST",
      nodes: [
        csrf(),
        textNode(`We sent a code to ${email}. (Mock mode — no real email; use ${MOCK_CODE}.)`),
        inputNode({ name: "code", type: "text", label: "Verification code", required: true }),
        submitNode({ name: "method", value: "code", label: "Verify email" }),
      ],
      messages: [],
    }
  }
  if (step === "done") {
    return { action: actionUrl("verification", id), method: "POST", nodes: [textNode("Your email is verified.")], messages: [] }
  }
  return {
    action: actionUrl("verification", id),
    method: "POST",
    nodes: [
      csrf(),
      inputNode({ name: "email", type: "email", label: "Email", required: true, autoComplete: "email" }),
      submitNode({ name: "method", value: "code", label: "Send verification code" }),
    ],
    messages: [],
  }
}

// Fixed mock TOTP secret — a real Kratos issues a per-enrollment secret and
// renders it as a `img` node (QR code) plus a `text` node (the secret,
// base32, for manual entry when a camera isn't available). No real QR
// encoding here (no extra dependency for a mock); the secret text plus the
// same fixed MOCK_CODE the rest of this shim already uses is enough to
// exercise and screenshot the actual enrollment UI.
const MOCK_TOTP_SECRET = "JBSWY3DPEHPK3PXP"

function settingsUi(id: string, user: MockUser | undefined, step: MockFlowState["step"]): UiContainer {
  const passwordGroup: UiNode[] = [
    textNode("Change password", "password"),
    inputNode({ name: "password", type: "password", label: "New password", required: true, autoComplete: "new-password", group: "password" }),
    submitNode({ name: "method", value: "password", label: "Update password", group: "password" }),
  ]

  let totpGroup: UiNode[]
  if (step === "totp-confirm") {
    totpGroup = [
      textNode("Two-factor authentication", "totp"),
      textNode(`Scan this with your authenticator app, or enter the setup key manually: ${MOCK_TOTP_SECRET}`, "totp"),
      textNode(`(Mock mode — no real QR code; enter ${MOCK_CODE} below to finish enrollment.)`, "totp"),
      inputNode({ name: "totp_code", type: "text", label: "Confirm code from your app", required: true, group: "totp" }),
      submitNode({ name: "method", value: "totp_confirm", label: "Confirm and enable", group: "totp" }),
    ]
  } else if (user?.totpEnabled) {
    totpGroup = [
      textNode("Two-factor authentication", "totp"),
      textNode("Enabled. You'll be asked for a code from your app on every login.", "totp"),
      submitNode({ name: "method", value: "totp_unlink", label: "Turn off", group: "totp" }),
    ]
  } else {
    totpGroup = [
      textNode("Two-factor authentication", "totp"),
      textNode("Not enabled. Add an authenticator app for a second login step.", "totp"),
      submitNode({ name: "method", value: "totp_setup", label: "Set up authenticator", group: "totp" }),
    ]
  }

  return { action: actionUrl("settings", id), method: "POST", nodes: [csrf(), ...passwordGroup, ...totpGroup], messages: [] }
}

function rawUi(kind: FlowKind, state: MockFlowState): UiContainer {
  switch (kind) {
    case "login":
      return loginUi(state.id, state.step, state.email)
    case "registration":
      return registrationUi(state.id)
    case "recovery":
      return recoveryUi(state.id, state.step, state.email)
    case "verification":
      return verificationUi(state.id, state.step, state.email)
    case "settings":
      return settingsUi(state.id, userById(state.userId), state.step)
    default:
      throw new Error(`mock auth: unsupported flow kind "${kind}"`)
  }
}

/** Builds the flow's UI for display, applying (and consuming) any error/message left by the last submit. */
function buildFlowUi(kind: FlowKind, state: MockFlowState): UiContainer {
  let ui = rawUi(kind, state)
  if (state.lastError) {
    const { field, message } = state.lastError
    state.lastError = undefined
    ui = { ...ui, nodes: withFieldError(ui.nodes, field, message) }
  }
  if (state.lastMessage) {
    const { type, text } = state.lastMessage
    state.lastMessage = undefined
    ui = { ...ui, messages: [...(ui.messages ?? []), { id: Date.now(), type, text }] }
  }
  return ui
}

export function createMockFlow(kind: FlowKind, returnTo?: string, userId?: string): MockFlow {
  const id = newId(kind)
  const state: MockFlowState = { id, kind, returnTo, step: "start", userId, createdAt: Date.now() }
  mockStore.flows.set(id, state)
  return { id, ui: buildFlowUi(kind, state) }
}

export function getMockFlow(kind: FlowKind, id: string): MockFlow | null {
  const state = mockStore.flows.get(id)
  if (!state || state.kind !== kind) return null
  return { id, ui: buildFlowUi(kind, state) }
}

export type SubmitResult =
  | { kind: "rerender"; location: string }
  | { kind: "redirect"; location: string; setSessionCookie?: string }

function sessionFor(user: MockUser): { token: string } {
  const token = newId("sess")
  const session = {
    id: token,
    active: true,
    authenticator_assurance_level: user.totpEnabled ? "aal2" : "aal1",
    identity: {
      id: user.id,
      schema_id: "default",
      schema_url: "",
      traits: { email: user.email, roles: user.roles },
      verifiable_addresses: [
        { value: user.email, verified: user.verified, via: "email", status: user.verified ? "completed" : "sent" },
      ],
    },
  } as unknown as Session
  mockStore.sessions.set(token, session)
  return { token }
}

function revokeOtherSessions(user: MockUser, exceptToken?: string) {
  for (const [token, session] of mockStore.sessions) {
    if (token === exceptToken) continue
    if ((session.identity?.traits as { email?: string })?.email === user.email) mockStore.sessions.delete(token)
  }
}

function fail(state: MockFlowState, field: string, message: string): SubmitResult {
  state.lastError = { field, message }
  mockStore.flows.set(state.id, state)
  return { kind: "rerender", location: `${pagePath(state.kind)}?flow=${state.id}` }
}

function advance(state: MockFlowState, step: MockFlowState["step"], patch?: { email?: string; userId?: string }): SubmitResult {
  state.step = step
  if (patch?.email) state.email = patch.email
  if (patch?.userId) state.userId = patch.userId
  mockStore.flows.set(state.id, state)
  return { kind: "rerender", location: `${pagePath(state.kind)}?flow=${state.id}` }
}

function note(state: MockFlowState, type: "success" | "info", text: string, step?: MockFlowState["step"]): SubmitResult {
  state.lastMessage = { type, text }
  if (step) state.step = step
  mockStore.flows.set(state.id, state)
  return { kind: "rerender", location: `${pagePath(state.kind)}?flow=${state.id}` }
}

export function submitMockFlow(
  kind: FlowKind,
  id: string,
  body: Record<string, string>,
  currentSession?: { userId: string; token: string }
): SubmitResult {
  const state = mockStore.flows.get(id)
  if (!state || state.kind !== kind) {
    // Dead/unknown flow — real Kratos would 410/403/400 here (isDeadFlowError
    // in ../flows.ts); the route handler just starts a fresh one.
    return { kind: "redirect", location: `/api/mock-kratos/self-service/${kind}/browser` }
  }

  if (kind === "login") {
    if (state.step === "totp") {
      const user = userById(state.userId)
      if (!user) return fail(state, "totp_code", "Session expired — start over.")
      if ((body["totp_code"] ?? "") !== MOCK_CODE) return fail(state, "totp_code", "That code isn't right.")
      const { token } = sessionFor(user)
      return { kind: "redirect", location: state.returnTo || "/login", setSessionCookie: token }
    }
    const email = body["identifier"] ?? ""
    const password = body["password"] ?? ""
    const user = findUser(email)
    if (!user || user.password !== password) return fail(state, "identifier", "That email or password isn't right.")
    // AAL2 challenge — playbook B5/B1: an MFA-enrolled account doesn't get a
    // session on password alone, it advances to a second step first.
    if (user.totpEnabled) return advance(state, "totp", { userId: user.id })
    const { token } = sessionFor(user)
    return { kind: "redirect", location: state.returnTo || "/login", setSessionCookie: token }
  }

  if (kind === "registration") {
    const email = body["traits.email"] ?? ""
    const password = body["password"] ?? ""
    const role = body["traits.roles"]
    if (!email || !password) return fail(state, "traits.email", "Email and password are required.")
    if (findUser(email)) return fail(state, "traits.email", "An account with this email already exists.")
    if (password.length < 8) return fail(state, "password", "Password must be at least 8 characters.")
    const user: MockUser = {
      id: newId("user"),
      email,
      password,
      roles: role ? [role] : ["merchant"],
      verified: false,
      totpEnabled: false,
    }
    mockStore.users.set(email.toLowerCase(), user)
    const { token } = sessionFor(user)
    return { kind: "redirect", location: state.returnTo || "/login", setSessionCookie: token }
  }

  if (kind === "recovery") {
    if (state.step === "start") {
      const email = body["email"] ?? ""
      if (!findUser(email)) return fail(state, "email", "No account uses that email.")
      return advance(state, "code", { email })
    }
    if (state.step === "code") {
      if ((body["code"] ?? "") !== MOCK_CODE) return fail(state, "code", "That code isn't right.")
      const user = state.email ? findUser(state.email) : undefined
      if (!user) return fail(state, "code", "That code isn't right.")
      // Real Kratos hands a verified recovery flow off to the settings flow
      // for the actual password change (`continue_with: show_settings_ui`)
      // rather than collecting a new password inside the recovery flow
      // itself — this repo already has that settings page at
      // /account/security (src/app/account/security/page.tsx), so recovery
      // hands off to it too instead of duplicating password-change UI/policy
      // in two places. The settings flow needs a session to be reachable at
      // all (its own page checks getSession() first) — recovery verifying
      // ownership of the account *is* enough to grant one, same as Kratos's
      // own privileged post-recovery session.
      const settingsFlow = createMockFlow("settings", state.returnTo, user.id)
      mockStore.flows.set(settingsFlow.id, {
        ...mockStore.flows.get(settingsFlow.id)!,
        lastMessage: { type: "info", text: "Code verified. Choose a new password below." },
      })
      const { token } = sessionFor(user)
      return { kind: "redirect", location: `/account/security?flow=${settingsFlow.id}`, setSessionCookie: token }
    }
  }

  if (kind === "verification") {
    if (state.step === "start") {
      const email = body["email"] ?? ""
      if (!findUser(email)) return fail(state, "email", "No account uses that email.")
      return advance(state, "code", { email })
    }
    if (state.step === "code") {
      if ((body["code"] ?? "") !== MOCK_CODE) return fail(state, "code", "That code isn't right.")
      const user = state.email ? findUser(state.email) : undefined
      if (user) user.verified = true
      return advance(state, "done")
    }
  }

  if (kind === "settings") {
    const user = userById(state.userId ?? currentSession?.userId)
    if (!user) return fail(state, "password", "Your session expired — log in again.")
    if (!state.userId) state.userId = user.id
    const method = body["method"]

    if (method === "password") {
      const password = body["password"] ?? ""
      if (password.length < 8) return fail(state, "password", "Password must be at least 8 characters.")
      user.password = password
      // Kratos settings' own default: a credential change revokes other
      // sessions too (Session Management doc) — keep the one making the
      // change.
      revokeOtherSessions(user, currentSession?.token)
      return note(state, "success", "Password updated.", "start")
    }

    if (method === "totp_setup") {
      return advance(state, "totp-confirm")
    }

    if (method === "totp_confirm") {
      if ((body["totp_code"] ?? "") !== MOCK_CODE) return fail(state, "totp_code", "That code isn't right.")
      user.totpEnabled = true
      return note(state, "success", "Two-factor authentication enabled.", "start")
    }

    if (method === "totp_unlink") {
      user.totpEnabled = false
      return note(state, "info", "Two-factor authentication turned off.", "start")
    }

    return fail(state, "password", "Unknown action.")
  }

  return { kind: "redirect", location: `/api/mock-kratos/self-service/${kind}/browser` }
}
