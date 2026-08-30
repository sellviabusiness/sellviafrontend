/**
 * Dev-only mock Kratos shim — OFF by default, opt in with MOCK_AUTH=1 in
 * .env.local. Every real auth code path (sdk.ts, flows.ts, session.ts,
 * logout.ts) is untouched when this is off; they still require a real
 * ORY_SDK_URL and throw exactly as before.
 *
 * Exists because this environment has no reachable Kratos instance and no
 * local Kratos infra to stand one up (confirmed: no docker-compose, no
 * kratos config anywhere in the repo) — matches how the reference project
 * (sellviaproject) actually runs day to day: it defaults to an in-memory
 * mock auth provider so the four screens are viewable/testable without real
 * Kratos. This is the same idea, adapted to this repo's own architecture
 * (server-rendered flows, native form POST to `ui.action`, generic
 * `ui.nodes` renderer) instead of copying the reference's client-side
 * AJAX provider abstraction wholesale.
 *
 * Delete `src/lib/ory/mock/`, `src/app/api/mock-kratos/`, and the three
 * `isMockAuth()` branches in sdk.ts/flows.ts once a real Kratos URL exists.
 */
export function isMockAuth(): boolean {
  return process.env.MOCK_AUTH === "1"
}
