/**
 * MOCK DATA LAYER — Authentication user directory.
 *
 * Stands in for: Ory Kratos's identity store, accessed via `@ory/client`'s FrontendApi — NOT a
 * SellVia REST endpoint. The real implementation already exists side-by-side in this codebase
 * (lib/auth/kratos/provider.ts) and is a straight env-var swap
 * (NEXT_PUBLIC_AUTH_PROVIDER=kratos, lib/auth/provider.ts) — no call-site changes needed
 * anywhere, since every screen already goes through the one `authProvider` seam, never this
 * file directly.
 *
 * Fields this file invents that Kratos itself doesn't natively have an agreed trait for yet
 * (flagged repeatedly since Feature 1/2): `roles`, `onboardingComplete`, `mfaEnabled`. These need
 * a confirmed Kratos identity-schema trait (or a small SellVia-side user-profile endpoint
 * alongside Kratos) before the real swap is complete — see lib/auth/types.ts's AuthProvider doc
 * comment for the exact real/no-op split per provider.
 *
 * DEV-ONLY MOCK "backend". A tiny fake user directory kept in localStorage, purely so
 * register → verify → log out → log in round-trips actually work while building against no
 * real Kratos environment. None of this exists once NEXT_PUBLIC_AUTH_PROVIDER=kratos is set.
 */

export interface MockUser {
  id: string;
  email: string;
  password: string;
  roles: string[];
  verified: boolean;
  /** TOTP second factor — B5. Off by default; enrolled from /account/security. */
  mfaEnabled: boolean;
  /** Feature 2 — the authoritative flag, part of the account record itself (not just a
   *  side-channel cookie). Mirrored into the session cookie by provider.ts whenever a session is
   *  (re)issued, so AppSession.onboardingComplete stays in sync with this. */
  onboardingComplete: boolean;
  /** Playbook 07 G8 — real signup timestamp, needed for the 24h/48h churn-signal query
   *  (Analytics/Activation, Aha Moment & Churn Signals). Optional only because accounts created
   *  before this field existed won't have it — treated as "not at risk" rather than crashing. */
  createdAt?: string;
}

const KEY = "sellvia_mock_users";

/** Seeded so login is testable without registering first. mfaEnabled starts false
 *  on purpose — enrolling it yourself via /account/security is the actual B5 test.
 *  onboardingComplete also starts false — completing onboarding for this account is itself
 *  part of testing Feature 2 end to end, not something to seed away. */
const DEMO_USER: MockUser = {
  id: "demo-user",
  email: "demo@sellvia.test",
  password: "password123",
  roles: ["merchant"],
  verified: true,
  mfaEnabled: false,
  onboardingComplete: false,
};

/**
 * Playbook 07 §6.1 — the one real prerequisite the Admin Panel audit found blocking: nothing in
 * the registration UI (RoleSelector only offers merchant/creator) ever grants a session the
 * "admin" role, so nothing could reach `/admin/*` at all. Seeded the same way DEMO_USER already
 * is — a dev-only account, not a real invite/grant flow (there isn't one, and building one is
 * out of scope for a single flat MVP admin role, per Operations/Admin Panel's own Open Question).
 * `onboardingComplete: true` deliberately — Feature 2's onboarding flow has nothing for an
 * admin-only session to fill in (its role-select step only offers merchant/creator), so this
 * account skips it entirely rather than being forced through a flow that doesn't apply to it.
 */
const ADMIN_USER: MockUser = {
  id: "admin-user",
  email: "admin@sellvia.test",
  password: "adminpass123",
  roles: ["admin"],
  verified: true,
  mfaEnabled: false,
  onboardingComplete: true,
};

const SEED_USERS: MockUser[] = [DEMO_USER, ADMIN_USER];

function readAll(): MockUser[] {
  if (typeof localStorage === "undefined") return SEED_USERS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(SEED_USERS));
      return SEED_USERS;
    }
    const users = JSON.parse(raw) as MockUser[];
    // A browser that already has a saved user list from before this admin seed existed
    // wouldn't otherwise ever pick it up — top it up rather than resetting real progress.
    if (!users.some((u) => u.email.toLowerCase() === ADMIN_USER.email)) {
      const withAdmin = [...users, ADMIN_USER];
      localStorage.setItem(KEY, JSON.stringify(withAdmin));
      return withAdmin;
    }
    return users;
  } catch {
    return SEED_USERS;
  }
}

function writeAll(users: MockUser[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(users));
}

export function findUser(email: string): MockUser | undefined {
  return readAll().find((u) => u.email.toLowerCase() === email.toLowerCase());
}

/** Playbook 07 G4 — the ONLY way lib/admin/store.ts is allowed to enumerate accounts (never
 *  touches this file's localStorage key directly, same "one owning file per domain" rule
 *  everywhere else). Real equivalent: a real Admin `GET /admin/users` endpoint — one this
 *  frontend's own SellVia backend would own, not a direct Kratos Admin API call (Kratos's own
 *  Admin API lists *identities*, not roles/suspension state layered on top by SellVia). */
export function getAllUsers(): MockUser[] {
  return readAll();
}

export function createUser(email: string, password: string, roles: string[]): MockUser {
  const user: MockUser = {
    id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    email,
    password,
    roles,
    verified: false,
    mfaEnabled: false,
    onboardingComplete: false,
    createdAt: new Date().toISOString(),
  };
  writeAll([...readAll(), user]);
  return user;
}

export function markVerified(email: string) {
  writeAll(readAll().map((u) => (u.email.toLowerCase() === email.toLowerCase() ? { ...u, verified: true } : u)));
}

export function setPassword(email: string, password: string) {
  writeAll(readAll().map((u) => (u.email.toLowerCase() === email.toLowerCase() ? { ...u, password } : u)));
}

/** B5: toggled from /account/security's TOTP enroll/disable submit. */
export function setMfaEnabled(email: string, enabled: boolean) {
  writeAll(readAll().map((u) => (u.email.toLowerCase() === email.toLowerCase() ? { ...u, mfaEnabled: enabled } : u)));
}

/** Feature 2 — role confirm/adjust step (C1) writes here via AuthProvider.updateRoles, not
 *  directly — see provider.ts. */
export function setRoles(email: string, roles: string[]) {
  writeAll(readAll().map((u) => (u.email.toLowerCase() === email.toLowerCase() ? { ...u, roles } : u)));
}

/** Feature 2 — via AuthProvider.markOnboardingComplete, not called directly outside provider.ts. */
export function setOnboardingComplete(email: string, complete: boolean) {
  writeAll(
    readAll().map((u) => (u.email.toLowerCase() === email.toLowerCase() ? { ...u, onboardingComplete: complete } : u)),
  );
}
