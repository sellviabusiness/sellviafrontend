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

// Auth scheme is unconfirmed too — no header is sent unless a provider is set.
// Wire the real scheme (Bearer token, cookie, custom header — API-CONTRACT-SHEET
// will say which) via setAuthTokenProvider once known.
type AuthTokenProvider = () => string | null | undefined
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
  const { method = "GET", body, timeoutMs = 15000, skipAuth, headers, ...rest } = options

  const finalHeaders = new Headers(headers)
  finalHeaders.set("Accept", "application/json")
  if (body !== undefined) finalHeaders.set("Content-Type", "application/json")
  if (!skipAuth) {
    const token = authTokenProvider?.()
    if (token) finalHeaders.set("Authorization", `Bearer ${token}`) // TODO: confirm scheme against API-CONTRACT-SHEET
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response
  try {
    response = await fetch(`${resolveBaseUrl()}${path}`, {
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
  const data = text ? safeJsonParse(text) : undefined

  if (!response.ok) {
    throw decodeApiError(response.status, data)
  }

  return data as T
}
