import { AxiosError, type AxiosResponse } from "axios"
import type { LoginFlow, RegistrationFlow, RecoveryFlow, VerificationFlow, SettingsFlow, Session } from "@ory/client"

import type { FlowKind } from "../flows"
import { mockStore } from "./store"
import { getMockFlow, type MockFlow } from "./flows"

export const MOCK_SESSION_COOKIE = "sv_mock_session"

function fakeAxiosResponse<T>(data: T, status: number): AxiosResponse<T> {
  return { data, status, statusText: "", headers: {}, config: {} as never }
}

function deadFlowError(): AxiosError {
  // Mirrors what isDeadFlowError() (lib/ory/flows.ts) recognizes from a real
  // Kratos response — 410 Gone for an expired/used flow id.
  return new AxiosError("mock: flow not found or expired", "410", undefined, undefined, fakeAxiosResponse({}, 410))
}

function noSessionError(): AxiosError {
  return new AxiosError("mock: no active session", "401", undefined, undefined, fakeAxiosResponse({}, 401))
}

function readCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=")
    if (k === name) return rest.join("=")
  }
  return undefined
}

function asFlow<T>(flow: MockFlow): T {
  // The real SDK types (LoginFlow/RegistrationFlow/...) carry many fields
  // (issued_at, expires_at, request_url, type, ...) that flow-form.tsx and
  // the four page.tsx files never read — only `.ui` (and `.id`) are used.
  // Casting rather than hand-filling every field the mock doesn't need.
  return flow as unknown as T
}

/** Resolves the current mock session (if any) from a raw `cookie` request header — shared by the settings browser/submit route handlers, which need to know who's making the request before a flow exists. */
export function resolveMockSession(cookieHeader: string | undefined): { userId: string; token: string } | undefined {
  const token = readCookie(cookieHeader, MOCK_SESSION_COOKIE)
  if (!token) return undefined
  const session = mockStore.sessions.get(token)
  const userId = session?.identity?.id
  return userId ? { userId, token } : undefined
}

function getFlowOrThrow(kind: FlowKind, id: string | undefined): MockFlow {
  if (!id) throw deadFlowError()
  const flow = getMockFlow(kind, id)
  if (!flow) throw deadFlowError()
  return flow
}

/**
 * Same method surface as @ory/client's FrontendApi, limited to what this
 * repo actually calls (see grep of `getOry()` usage across src/app/*
 * page.tsx, lib/ory/session.ts, lib/ory/logout.ts). Everything runs
 * in-process against the shared in-memory store — no network hop, which
 * also sidesteps needing a real reachable host/port for the SDK's own
 * basePath.
 */
export const mockOryClient = {
  async getLoginFlow({ id }: { id?: string; cookie?: string }) {
    return fakeAxiosResponse(asFlow<LoginFlow>(getFlowOrThrow("login", id)), 200)
  },
  async getRegistrationFlow({ id }: { id?: string; cookie?: string }) {
    return fakeAxiosResponse(asFlow<RegistrationFlow>(getFlowOrThrow("registration", id)), 200)
  },
  async getRecoveryFlow({ id }: { id?: string; cookie?: string }) {
    return fakeAxiosResponse(asFlow<RecoveryFlow>(getFlowOrThrow("recovery", id)), 200)
  },
  async getVerificationFlow({ id }: { id?: string; cookie?: string }) {
    return fakeAxiosResponse(asFlow<VerificationFlow>(getFlowOrThrow("verification", id)), 200)
  },
  async getSettingsFlow({ id, cookie }: { id?: string; cookie?: string }) {
    // Settings is the one flow kind that's authenticated — no session, no
    // flow, same as a real Kratos settings-flow fetch without a cookie.
    const token = readCookie(cookie, MOCK_SESSION_COOKIE)
    if (!token || !mockStore.sessions.get(token)) throw noSessionError()
    return fakeAxiosResponse(asFlow<SettingsFlow>(getFlowOrThrow("settings", id)), 200)
  },
  async toSession({ cookie }: { cookie?: string }) {
    const token = readCookie(cookie, MOCK_SESSION_COOKIE)
    const session = token ? mockStore.sessions.get(token) : undefined
    if (!session) throw noSessionError()
    return fakeAxiosResponse(session as Session, 200)
  },
  async createBrowserLogoutFlow() {
    return fakeAxiosResponse({ logout_url: "/api/mock-kratos/self-service/logout/browser", logout_token: "mock" }, 200)
  },
}
