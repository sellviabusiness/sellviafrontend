import type { ApiErrorBody } from "./types"

// Buckets by HTTP status band — works before any real error code is known.
// Once API-CONTRACT-SHEET lists actual codes, add them to CODE_COPY_OVERRIDES
// below rather than widening this list; kind stays the fallback layer.
export type ApiErrorKind =
  | "validation"
  | "auth"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "server"
  | "network"
  | "timeout"
  | "unknown"

const KIND_COPY: Record<ApiErrorKind, string> = {
  validation: "Check the highlighted fields and try again.",
  auth: "Your session expired. Log in again to continue.",
  forbidden: "You don't have permission to do that.",
  not_found: "We couldn't find what you're looking for.",
  conflict: "That was changed or already exists elsewhere. Refresh and try again.",
  rate_limited: "Too many requests — wait a moment and try again.",
  server: "Something went wrong on our end. Try again shortly.",
  network: "Can't reach the server. Check your connection and try again.",
  timeout: "That took too long. Try again.",
  unknown: "Something went wrong. Try again.",
}

/**
 * Per-code UI copy that should override even the SERVER's own message — reserved for a code
 * whose real message is accurate but frontend genuinely wants different wording (tone, more
 * context, a link, whatever). Empty by design: API-ENDPOINTS.md's own framing ("the exact
 * message text, not paraphrased") plus every example message actually reading like real,
 * specific, actionable UI copy — not a debug string — means the default is to trust
 * `serverMessage` (see ApiError below), not to re-write it here as codes get confirmed. Add an
 * entry only when a specific message is confirmed wrong or worse for this app, not just to
 * "have coverage."
 */
const CODE_COPY_OVERRIDES: Record<string, string> = {}

function classify(httpStatus: number): ApiErrorKind {
  if (httpStatus === 401) return "auth"
  if (httpStatus === 403) return "forbidden"
  if (httpStatus === 404) return "not_found"
  if (httpStatus === 409) return "conflict"
  if (httpStatus === 422 || httpStatus === 400) return "validation"
  if (httpStatus === 429) return "rate_limited"
  if (httpStatus >= 500) return "server"
  return "unknown"
}

export class ApiError extends Error {
  /** Server's error.code, or a synthetic one (network_error/timeout/unknown_error) for non-envelope failures. */
  readonly code: string
  /** Server's error.status if the envelope was present, else the HTTP status (0 for network/timeout failures). */
  readonly status: number
  readonly kind: ApiErrorKind
  /** Actionable copy safe to show a user — prefers a frontend override, then the server's own
   *  message, then a generic status-band fallback. See CODE_COPY_OVERRIDES above for why the
   *  server's message is trusted by default rather than re-paraphrased per code. */
  readonly uiMessage: string
  /** Raw message from the server body, if any — same value uiMessage falls back to; kept
   *  separately for a caller that wants it regardless of what uiMessage resolved to. */
  readonly serverMessage?: string

  constructor(params: { code: string; status: number; serverMessage?: string }) {
    const kind = params.status === 0
      ? params.code === "timeout" ? "timeout" : "network"
      : classify(params.status)
    const uiMessage = CODE_COPY_OVERRIDES[params.code] ?? params.serverMessage ?? KIND_COPY[kind]

    super(uiMessage)
    this.name = "ApiError"
    this.code = params.code
    this.status = params.status
    this.kind = kind
    this.uiMessage = uiMessage
    this.serverMessage = params.serverMessage
  }
}

function isApiErrorBody(data: unknown): data is ApiErrorBody {
  if (typeof data !== "object" || data === null || !("error" in data)) return false
  const err = (data as { error?: unknown }).error
  return (
    typeof err === "object" &&
    err !== null &&
    typeof (err as Record<string, unknown>).code === "string" &&
    typeof (err as Record<string, unknown>).message === "string"
  )
}

/** Turns a non-ok response body into a typed ApiError, tolerating a body that isn't the expected envelope. */
export function decodeApiError(httpStatus: number, data: unknown): ApiError {
  if (isApiErrorBody(data)) {
    const { code, message, status } = data.error
    return new ApiError({
      code,
      status: typeof status === "number" ? status : httpStatus,
      serverMessage: message,
    })
  }
  return new ApiError({ code: "unknown_error", status: httpStatus })
}
