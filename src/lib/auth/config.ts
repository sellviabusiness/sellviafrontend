/**
 * Which auth backend the app talks to. Defaults to "mock" — the frontend must be usable with
 * zero real environment available (per current project instruction). Flip to real Clerk by
 * setting NEXT_PUBLIC_AUTH_PROVIDER=clerk (and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY /
 * CLERK_SECRET_KEY) — see lib/auth/clerk/ and every auth screen's `isMockMode` branch.
 */
export type AuthMode = "mock" | "clerk";

export const AUTH_MODE: AuthMode =
  process.env.NEXT_PUBLIC_AUTH_PROVIDER === "clerk" ? "clerk" : "mock";

export const isMockMode = AUTH_MODE === "mock";
