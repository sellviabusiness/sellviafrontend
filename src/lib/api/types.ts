// Shapes are pinned only where the task itself specified them. Everything else
// here (base URL var name, auth scheme, endpoint list) is unverified against
// REST Standards / Error Responses / API-CONTRACT-SHEET — those docs were
// unreachable when this was built (private submodule, no bypass secret).
// Fill in real endpoint types per-call at the API-CONTRACT-SHEET, don't guess here.

/** The one error envelope shape the task specified: { error: { code, message, status } }. */
export interface ApiErrorBody {
  error: {
    /** Machine-readable code, e.g. "invalid_credentials". Registry in errors.ts maps known codes to UI copy. */
    code: string
    /** Server-authored message — not guaranteed to be end-user-safe copy, used only as a last-resort fallback. */
    message: string
    /** Server's own status, may differ from the HTTP status code on the response. */
    status: number
  }
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export interface ApiRequestOptions extends Omit<RequestInit, "body" | "method"> {
  method?: HttpMethod
  /** JSON-serializable request body. Sent as application/json. */
  body?: unknown
  /** Aborts the request past this many ms. Default 15000. */
  timeoutMs?: number
  /** Skip attaching the Authorization header for this call (public endpoints). */
  skipAuth?: boolean
}
