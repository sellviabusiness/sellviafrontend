/**
 * A normalized request failure — status + raw body, shaped the same regardless of which
 * provider threw it. The Kratos provider wraps axios errors into this at the boundary
 * (lib/auth/kratos/provider.ts); the mock provider throws it directly. `classifyAuthError`
 * below never needs to know which one it's looking at.
 */
export class AuthRequestError extends Error {
  constructor(
    public status: number,
    public data: unknown,
  ) {
    super(`Auth request failed with status ${status}`);
    this.name = "AuthRequestError";
  }
}

export type AuthCallError =
  | { kind: "flow"; flow: unknown }
  | { kind: "expired"; message: string }
  | { kind: "message"; message: string }
  | { kind: "unreachable" };

/**
 * Normalizes whatever a failed flow call throws into one of a few shapes the UI knows how to
 * render. Per Docs/UX/Copy Guidelines, the goal is always a specific, actionable message —
 * never a raw stack trace or an internal error id surfaced verbatim.
 */
export function classifyAuthError(err: unknown): AuthCallError {
  if (!(err instanceof AuthRequestError)) return { kind: "unreachable" };

  const { status, data } = err;

  // 410: the flow expired server-side (or, for the mock, "doesn't exist").
  if (status === 410 || status === 404) {
    return {
      kind: "expired",
      message: "This form has expired. Please start again.",
    };
  }

  // The provider returns the *updated flow itself* (with field/flow-level messages) on 400
  // validation failures — that's not an exceptional case, it's the normal "show the error
  // inline" path.
  if (data && typeof data === "object" && "ui" in data) {
    return { kind: "flow", flow: data };
  }

  const message = extractGenericMessage(data);
  if (message) return { kind: "message", message };

  return {
    kind: "message",
    message: "Something on our side didn't work. Please try again.",
  };
}

function extractGenericMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const maybeError = (data as { error?: unknown }).error;
  if (maybeError && typeof maybeError === "object" && "message" in maybeError) {
    const message = (maybeError as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return null;
}
