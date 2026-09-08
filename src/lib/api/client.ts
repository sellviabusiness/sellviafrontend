import { ApiError, decodeApiError } from "./errors"
import type { ApiRequestOptions } from "./types"

// Base URL: unverified against Hosting Strategy / API-CONTRACT-SHEET (unreachable —
// private submodule, no bypass secret). API_BASE_URL for server-side calls,
// NEXT_PUBLIC_API_BASE_URL if this ever needs to run client-side. Fails loud
// rather than silently hitting a wrong/placeholder host.
function resolveBaseUrl(): string {
  const url = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL
  if (!url) {
    throw new Error(
      "API base URL not configured — set API_BASE_URL (server) or NEXT_PUBLIC_API_BASE_URL (client) in .env.local. Placeholder until the contract sheet confirms the real host."
    )
  }
  return url.replace(/\/+$/, "")
}

// Auth scheme confirmed with the backend: `Authorization: Bearer <clerk-session-token>` (see
// the backend integration thread — clerk-backend-api's authenticate_request_async on their
// side). Async because Clerk's own getToken() is (it may refresh a near-expired token).
//
// Client-side only — see components/auth/clerk/api-auth-bridge.tsx, the one thing that calls
// this, for why Server Components/Actions must NOT rely on it and should pass
// ApiRequestOptions.authToken instead (a single module-level value here is safe for the browser,
// one visitor, but not for the Next.js server process serving many users' requests concurrently).
type AuthTokenProvider = () => string | null | undefined | Promise<string | null | undefined>
let authTokenProvider: AuthTokenProvider | null = null

export function setAuthTokenProvider(provider: AuthTokenProvider | null) {
  authTokenProvider = provider
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

// ROOT CAUSE FOUND LIVE (backend confirmed the error side: { data: null, error: {...} } —
// app/core/envelope.py) — this backend wraps EVERY response, success included, the same way:
// { data: <real payload>, error: null }. Only the error half was ever unwrapped here
// (decodeApiError reads `.error`); a successful response's real payload sits one level deeper
// than every caller assumed. getFitSummary destructuring `.summary`, draftCopy destructuring
// `.text` — both would've silently received `undefined` for every field, not a thrown error,
// the moment either endpoint existed. Unwrapped once here for every caller rather than patched
// per call site.
function isEnvelope(data: unknown): data is { data: unknown; error: unknown } {
  return typeof data === "object" && data !== null && "data" in data && "error" in data && (data as { error: unknown }).error == null
}

/**
 * One typed client over the FastAPI service. Resolves with the parsed JSON body
 * on 2xx, throws ApiError (see errors.ts) on any non-2xx, network failure, or
 * timeout — callers read `.uiMessage` for copy safe to show the user, `.kind`
 * to branch behavior (e.g. redirect to login on "auth").
 */
export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { method = "GET", body, timeoutMs = 15000, skipAuth, authToken, headers, ...rest } = options

  const finalHeaders = new Headers(headers)
  finalHeaders.set("Accept", "application/json")
  if (body !== undefined) finalHeaders.set("Content-Type", "application/json")
  if (!skipAuth) {
    // authToken (even `null`) always wins over the provider — see its doc comment in types.ts.
    const token = authToken !== undefined ? authToken : await authTokenProvider?.()
    if (token) finalHeaders.set("Authorization", `Bearer ${token}`)
  }

  // BUG FOUND LIVE — resolveBaseUrl() used to be called *inside* the fetch() call below, which
  // put its throw inside the same try/catch meant for genuine network failures: a missing env
  // var got caught, relabeled "network_error", and shown as "Can't reach the server" — the
  // actionable "set API_BASE_URL..." message never actually reached anyone. Resolved up front,
  // outside that try, so a config problem surfaces as itself instead of masquerading as a flaky
  // connection.
  const baseUrl = resolveBaseUrl()

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...rest,
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch (cause) {
    if (controller.signal.aborted) {
      throw new ApiError({ code: "timeout", status: 0 })
    }
    throw new ApiError({
      code: "network_error",
      status: 0,
      serverMessage: cause instanceof Error ? cause.message : undefined,
    })
  } finally {
    clearTimeout(timeout)
  }

  const text = await response.text()
  const parsed = text ? safeJsonParse(text) : undefined

  if (!response.ok) {
    throw decodeApiError(response.status, parsed)
  }

  return (isEnvelope(parsed) ? parsed.data : parsed) as T
}
