/**
 * Clerk's real `errors` shape from useSignIn()/useSignUp() (verified against
 * @clerk/shared/dist/types/state.d.ts's `Errors<T>` — not documented in the guides, and not the
 * shape this file originally guessed):
 *
 *   { fields: { identifier: FieldError | null, password: FieldError | null, ... },
 *     global: ClerkGlobalHookError[] | null,   // errors NOT tied to any known field
 *     raw: unknown[] | null }
 *
 * BUG FIX — confirmed live against a real Clerk instance: an account-level error with no
 * associated field (e.g. `strategy_for_user_invalid` — attempting password sign-in on an
 * OAuth-only account) lands in `.global`, never in `.fields`. The original version of this file
 * only ever checked `errors.message` (doesn't exist on this type at all) and `errors.fields`
 * (real, but this class of error is never in there) — so a real 400 from Clerk's API produced
 * zero visible feedback: the button just stopped loading with nothing on screen, indistinguishable
 * from "not working". `clerkFieldError` was accidentally fine already (`FieldError` also has a
 * `.message`), only `clerkGlobalError` was wrong.
 */
interface ClerkFieldErrorLike {
  code?: string;
  message?: string;
  longMessage?: string;
}

interface ClerkGlobalErrorLike {
  message?: string;
  /** The nested per-error list Clerk's API actually returns (ClerkAPIResponseError.errors). */
  errors?: ClerkFieldErrorLike[];
}

interface ClerkErrorsLike {
  fields?: Record<string, ClerkFieldErrorLike | null | undefined>;
  global?: ClerkGlobalErrorLike[] | null;
}

/** The message for one specific field, if Clerk attached one — rendered inline under that field. */
export function clerkFieldError(errors: unknown, field: string): string | undefined {
  return (errors as ClerkErrorsLike | null | undefined)?.fields?.[field]?.message;
}

/** A form-wide banner message for whatever Clerk couldn't attach to a specific field. */
export function clerkGlobalError(errors: unknown): string | undefined {
  const first = (errors as ClerkErrorsLike | null | undefined)?.global?.[0];
  if (!first) return undefined;
  const nested = first.errors?.[0];
  return nested?.longMessage ?? nested?.message ?? first.message;
}
