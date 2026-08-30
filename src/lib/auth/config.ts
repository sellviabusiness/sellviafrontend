/**
 * Which AuthProvider implementation the app talks to. Defaults to "mock" — the frontend must
 * be usable with zero real Kratos environment available (per current project instruction).
 * Flip to real Kratos later by setting NEXT_PUBLIC_AUTH_PROVIDER=kratos (and a real
 * NEXT_PUBLIC_ORY_KRATOS_URL) — no code changes, see lib/auth/provider.ts.
 */
export type AuthMode = "mock" | "kratos";

export const AUTH_MODE: AuthMode =
  process.env.NEXT_PUBLIC_AUTH_PROVIDER === "kratos" ? "kratos" : "mock";

export const isMockMode = AUTH_MODE === "mock";
