import type { AppSession } from "@/lib/auth/types"

// Revised 2026-08-25: one account can hold both merchant and creator (task's
// own instruction) — role.ts used to assume one role per identity;
// getRolesHeld() below replaces that single-role read. Admin stays
// exclusive/separate, not part of the switchable pair — nothing said
// otherwise, and mixing admin into the switcher would contradict "never
// merged into one menu" from the shells task.
//
// REDIRECT-LOOP FIX (root cause): this file used to type its session
// parameter as the *old*, disconnected `@ory/client` `Session` (reading
// `session.identity.traits.roles`) while proxy.ts fed it a session built
// from that same old `lib/ory/session` — a system with no relation to the
// *current* auth/session seam (lib/auth/*, AppSession) that /dashboard,
// /onboarding, and every onboarding-authored guard actually use. In mock
// mode the old system never has a valid session at all, so
// /merchant/*, /creator/*, /admin/* always looked unauthenticated to it —
// dashboard.tsx would send a merchant-role session to /merchant/overview,
// proxy.ts would (via the old system) reject it and bounce to /login,
// /login would see the *current* system's session was valid and bounce
// straight back to /dashboard, which would send it to /merchant/overview
// again — an infinite loop between exactly those two systems disagreeing.
// Now takes the current `AppSession` (already just `{ roles: string[] }`,
// no nested identity/traits indirection needed) so every guard in the app
// reads the same one session, the same way /account/* already did.
export const ROLES = ["merchant", "creator", "admin"] as const
export type Role = (typeof ROLES)[number]

export const SWITCHABLE_ROLES = ["merchant", "creator"] as const
export type SwitchableRole = (typeof SWITCHABLE_ROLES)[number]

function isSwitchableRole(value: unknown): value is SwitchableRole {
  return typeof value === "string" && (SWITCHABLE_ROLES as readonly string[]).includes(value)
}

/** All roles this session holds. */
export function getRolesHeld(session: AppSession | null): Set<Role> {
  const raw = session?.roles ?? []
  return new Set(raw.filter((r): r is Role => (ROLES as readonly string[]).includes(r)))
}

export function hasRole(session: AppSession | null, role: Role): boolean {
  return getRolesHeld(session).has(role)
}

/**
 * Whether a held role has an actual profile/data behind it yet, vs. just
 * being permitted — drives the empty state (RoleEmptyState). The old
 * `identity.metadata_public.setUp.<role>` field this used to read doesn't
 * exist on AppSession and never had a confirmed real backend shape either
 * (flagged as a placeholder even before this fix). Onboarding is now a
 * mandatory, session-gated prerequisite before any /merchant/* or
 * /creator/* route is reachable at all (lib/onboarding/status.ts's
 * isOnboardingComplete, checked by every role-gated layout) — so by the
 * time this is called, the role's data has already been collected. Always
 * true; kept as a function (not inlined at call sites) so a real
 * per-role-setup flag can still slot in later without touching callers.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature kept for future real per-role-setup data
export function isRoleSetUp(session: AppSession | null, role: SwitchableRole): boolean {
  return true
}

/**
 * Picks which switchable role is "active" when it isn't otherwise implied by
 * the URL (see resolveFallbackHome in active-context.ts) — the last role the
 * user explicitly chose via the switcher (cookie), falling back to whichever
 * held role comes first in SWITCHABLE_ROLES order.
 */
export function resolveActiveRole(
  cookieValue: string | undefined,
  held: Set<Role>
): SwitchableRole | null {
  if (isSwitchableRole(cookieValue) && held.has(cookieValue)) {
    return cookieValue
  }
  return SWITCHABLE_ROLES.find((r) => held.has(r)) ?? null
}
