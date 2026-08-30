import type { Session } from "@ory/client"

import type { FlowKind } from "../flows"

export type MockUser = {
  id: string
  email: string
  password: string
  roles: string[]
  verified: boolean
  // MFA (playbook B5) — TOTP only (see mock/config.ts's neighboring comment
  // in flows.ts: WebAuthn needs the real script-node ceremony this repo's
  // renderer deliberately doesn't wire yet; TOTP is Kratos's other AAL2
  // method and needs no such ceremony).
  totpEnabled: boolean
}

export type MockFlowState = {
  id: string
  kind: FlowKind
  returnTo?: string
  // Recovery: "start" -> "code" (then hands off to a "settings" flow, no
  // in-place reset step — see submitMockFlow's recovery/"code" case).
  // Verification: "start" -> "code" -> "done".
  // Login: "start" -> "totp" (only when the account has MFA enabled).
  // Settings: "start" -> "totp-confirm" (mid-enrollment, showing the QR/secret).
  step: "start" | "code" | "done" | "totp" | "totp-confirm"
  email?: string
  // Which account this flow belongs to — set at creation for "settings" (an
  // authenticated flow, resolved from the session cookie) and "login" once a
  // password's been accepted (so the totp step knows who's completing it).
  userId?: string
  lastError?: { field: string; message: string }
  lastMessage?: { type: "success" | "info"; text: string }
  createdAt: number
}

type Store = {
  users: Map<string, MockUser>
  flows: Map<string, MockFlowState>
  sessions: Map<string, Session>
}

// Survives Next.js dev Fast Refresh (which would otherwise re-evaluate this
// module and wipe the in-memory Maps mid-session) — same globalThis-caching
// pattern used for singleton DB clients in Next.js dev.
const g = globalThis as unknown as { __mockOryStore?: Store }

function seed(): Store {
  const users = new Map<string, MockUser>()
  const demo: MockUser = {
    id: "mock-user-1",
    email: "demo@sellvia.test",
    password: "password123",
    roles: ["merchant"],
    verified: true,
    totpEnabled: false,
  }
  users.set(demo.email, demo)
  // Pre-enrolled account — lets the login-challenge step (B5) be exercised
  // directly without first walking through enrollment at /account/security.
  const mfaUser: MockUser = {
    id: "mock-user-2",
    email: "mfa@sellvia.test",
    password: "password123",
    roles: ["creator"],
    verified: true,
    totpEnabled: true,
  }
  users.set(mfaUser.email, mfaUser)
  return { users, flows: new Map(), sessions: new Map() }
}

export const mockStore: Store = g.__mockOryStore ?? seed()
g.__mockOryStore = mockStore

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

/** Fixed dev "code" for recovery/verification — there's no real email to send. Displayed inline in the flow's own message so the loop is completable without external mail infra. */
export const MOCK_CODE = "123456"
