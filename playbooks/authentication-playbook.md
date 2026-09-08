# Authentication Playbook

**Status: ready to build against.** All six source docs (`SCREEN_INVENTORY`, `Security/Authentication`, `Security/Session Management`, `Business Logic/User Flows`, `Business Logic/User Roles`, `Security/Password Policy`, `Security/Data Inventory & Disclosure`) have been read in full (2026-08-25, via direct filesystem access to the reference project at `C:\Users\HP\Desktop\sellviaproject\Docs` — the submodule/credential wall that blocked the original draft below was never actually about *these* docs being unreachable in principle, just unreachable through this repo's own `docs/` submodule path). Every item previously marked **NEEDS DOC** is resolved below, cited to its source. The handful of items the docs themselves leave open (not this playbook's gap — theirs) are listed as **Still open in the source docs** per screen, stated honestly rather than invented.

## Path note

Kept at `playbooks/authentication-playbook.md` (repo root), not `/docs/playbooks/...` — `docs/` is a submodule this repo doesn't own content in. See git history of this file for the original reasoning.

## Architecture (unchanged from the original draft — still accurate)

- **Kratos integration**: all auth pages (`src/app/login`, `registration`, `recovery`, `verification`) are generic renderers of Kratos's self-service "browser flow" — fetch a flow by id, render every node in `ui.nodes` generically ([flow-form.tsx](../src/components/ory/flow-form.tsx)), submit as a native HTML form POST straight to `ui.action`. Doesn't hardcode which auth methods are enabled.
- **Session model**: [lib/ory/session.ts](../src/lib/ory/session.ts) — `getSession()` calls Kratos's `toSession()` fresh every call, no caching. Matches `Security/Session Management`'s "server-validated, not a cached JWT" description of Kratos's model (§ Update 2026-08-04).
- **Route protection**: [proxy.ts](../src/proxy.ts) — `/merchant/*`, `/creator/*`, `/admin/*`, `/account/*` all call `getSession()`; no session → `/login?return_to=...`; wrong role → the role's own home, never a bare 403.
- **Role model**: [lib/auth/role.ts](../src/lib/auth/role.ts) — `merchant`/`creator` are held simultaneously (a dual-role account), `admin` is exclusive. **Now confirmed** by `Business Logic/User Roles` §"Can One Account Hold Both Roles?" — "Yes... nothing prevents one User from having both" — this was a correct placeholder assumption, not a guess that needed correcting.

## Cross-cutting resolutions (were "NEEDS DOC," now resolved)

1. **Role storage trait key.** `Business Logic/User Roles` confirms the *policy* (Merchant + Creator selectable and combinable at signup, per `User Flows`' "single unified sign-up form... picks Merchant or Creator"; Admin is a separate, internal, non-self-registerable role — `User Roles` describes it as "Internal SellVia team role," never mentioned as a signup option anywhere in `User Flows`). What no doc specifies is the *literal Kratos identity-schema field name* — that's an infra binding set when Kratos's schema is actually configured (Ory Network dashboard or schema JSON), not product/policy documentation. `role.ts`'s `traits.roles` (an array) is a reasonable placeholder consistent with the now-confirmed policy; swap it for the real field name once that schema exists. Not a blocking gap anymore — policy is settled, only a config binding remains.
2. **MFA method.** No doc names TOTP/WebAuthn/lookup-codes specifically. **Decision (made here, not sourced — flagged as such):** TOTP. Rationale: Kratos supports it natively with no extra ceremony; WebAuthn/passkey needs wiring Kratos's `script`-type UI nodes for the browser credential ceremony, which `flow-form.tsx` has deliberately never done (repeatedly flagged in this file's history as deferred pending exactly this kind of decision) — TOTP avoids that entirely and is standard AAL2. Revisit if WebAuthn is specifically wanted later.
3. **MFA mandatory for Admin?** `Security/Password Policy` states its own recommendation — "optional for Creators, and consider requiring it for Merchants and mandatory for Admin" — but leaves "whether MFA becomes mandatory (not just optional) for Merchants before launch" as an explicit open question **in the source doc itself**, not resolved by reading it more carefully. **Working policy adopted for this build:** optional/Creator, recommended/Merchant, strongly-recommended/Admin — the doc's own stated default — surfaced as guidance copy on `/account/security`, not enforced as a hard gate (see B5 below for why). **Still open in the source doc:** whether Admin-mandatory becomes a hard launch requirement.
4. **Password policy numeric rules.** `Security/Password Policy` is a Clerk-era doc with no "re-platformed on Kratos" update (unlike `Authentication` and `Session Management`, which both got one) — it never states a concrete minimum length or rule under Kratos. Real enforcement is Kratos server-side config, returned generically as `ui.nodes` messages (already rendered, `flow-form.tsx`). The mock's 8-character client-side minimum is a build-time placeholder for exercising the UI locally, not a documented policy — don't treat it as one.
5. **Registration data-disclosure copy.** Resolved by `Security/Data Inventory & Disclosure`'s inventory table: registration collects exactly **email** (the "Account identity" row — `kratos_identity_id` is server-assigned, not user-entered), stored in Ory Kratos, used for login/account identification. Everything else in that table (business name, niche, Paddle IDs, ...) is collected later, in role-specific onboarding — out of scope here. `DataDisclosureNotice` now states this. **Still open in the source doc:** exact legally-reviewed wording — that doc is explicit its own content is "technically accurate, not legally reviewed," deferred to end-of-build compliance review same as every other legal-language item in the docs. This playbook's copy is accurate to what the form does; it is not legal copy.
6. **Session revocation on recovery/password change, and whether a visible confirmation is needed.** `Session Management` confirms Kratos's model is server-validated with instant revocation (§ Update 2026-08-04), and that password change should "kill every other existing session, not just the one making the change." Built: both the recovery hand-off and `/account/security`'s password-change both revoke other sessions and show a visible confirmation ("Password updated." / recovery's own "signs you out everywhere else" copy) — not just an invisible side effect. **Not built:** a `listMySessions()`/`disableMySession()`-backed "active sessions" management screen, or the 5-concurrent-session cap `Session Management` describes ("the app enforces the cap itself... application-level logic") — that's most naturally an operation against Kratos's *Admin* API (privileged, server-side credentials), which per this repo's own standing rule belongs in `apps/backend`, not here. Flagging as backend-owned future work, not silently dropped.
7. **Default post-login landing route.** Resolved — already implemented, doesn't depend on Kratos's own `return_to` default at all: the frontend checks the session itself (`getSession()`) and routes via `resolveFallbackHome()`/`ROLE_PREFIX` (role-resolved, e.g. a Merchant lands on `/merchant`). This is intentional, not a gap — consistent with `Authentication`'s "role... read from the verified session... frontend never sets or trusts a client-side role value" principle applied to routing too.
8. **Does registration grant role eligibility only, or collect a full profile?** Resolved by `User Flows`: registration is step 1 of a multi-step flow ("Register, select role" → *then* "Create an Offer" / "Browse campaigns" as separate later steps) — eligibility only. Matches this repo's existing `isRoleSetUp()` + role-empty-state pattern, which was a correct inference.

---

## B1 — Login

**Purpose:** authenticate an existing account; land on the right place afterward; challenge for a second factor if the account has one enrolled.

**Screens/states:**
- `choose_method` — Kratos's enabled methods render via `ui.nodes` (password today; the generic renderer doesn't hardcode this).
- Validation error re-render — `aria-invalid`/`aria-describedby`/`role="alert"` wired.
- Expired/dead flow — [login/page.tsx](../src/app/login/page.tsx) detects 410/403/400 and restarts.
- **MFA challenge — built.** An MFA-enrolled account doesn't get a session on password alone; the same `/login` flow advances to a `totp` step (a single code field, same page, same architecture) before issuing a session. See resolution #2/#3 above for method/policy.

**Session/security rules:**
- Redirect if already authenticated — resolved (#7 above), implemented.
- No-session/expired handling — `proxy.ts`, unchanged.
- AAL2 (`session.authenticator_assurance_level`) is set on session issuance (`aal2` if the account has TOTP enrolled) but **nothing currently gates a route on it** — e.g. `/admin/*` doesn't yet require AAL2 even under the "strongly recommended for Admin" guidance. Deliberate: gating on an assurance level that isn't a confirmed mandatory policy (#3) would silently lock out accounts before that policy is actually decided. Real future work once #3 is settled, not built here.

**Data collected:** identifier (email) + password; + a TOTP code on the challenge step. No other fields.

**Role-specific differences:** none at the screen level — role only affects the post-login landing route.

## B2 — Register (with role selection)

**Purpose:** create an account, choosing Merchant, Creator, or both.

**Screens/states:** generic renderer ([registration/page.tsx](../src/app/registration/page.tsx)), same architecture as login. Role selection renders as a native `<select>` via `flow-form.tsx`'s `options`-aware branch — schema-driven, not a hand-built picker, so it can't drift from whatever Kratos's identity schema actually allows.

**Session/security rules:** on success, a session is issued immediately (matches `User Flows`' "sign up → branches into the role's flow" — no separate email-confirm-before-session gate is described) and the user lands on their role home.

**Data collected + disclosure:** email + password + role selection. Disclosure notice shown inline (resolution #5) — plain-language, at the point of collection, per `Data Inventory & Disclosure`'s "before, not after" principle.

**Role-specific differences:** Merchant vs. Creator vs. both — all three selectable per `User Roles`' dual-role confirmation; Admin is never offered here (internal-only, resolution #1).

## B3 — Forgot / Reset Password

**Purpose:** recover account access.

**Screens/states:** `/recovery` — email entry, then a code-entry step (`flow-form.tsx`'s generic renderer, both steps same architecture). On a verified code, hands off to a **settings flow** at `/account/security` for the actual new-password entry — matching Kratos's real `continue_with: show_settings_ui` behavior, and this repo's own existing settings page, rather than duplicating password-change UI/policy in two places.

**Session/security rules:** password change revokes other sessions (resolution #6), with a visible confirmation, not just an invisible default.

**Data collected:** email, then a recovery code, then (on the settings page) a new password.

**Role-specific differences:** none — identical for every role.

## B4 — Verify Email

**Purpose:** confirm email ownership.

**Screens/states:** `/verification` — pending → code entry → verified, generic renderer, same architecture.

**Session/security rules:** verification status is read from the session's `verifiable_addresses`; nothing in the source docs describes a *forced*-verification gate (e.g., blocking dashboard access until verified) — not built, since inventing an enforcement point the docs don't describe would be a real product decision, not a documentation gap to fill in.

**Data collected:** a verification code (email already known from the session).

**Role-specific differences:** none.

## B5 — MFA Setup and Challenge

**Purpose:** let an account enroll a second factor (TOTP), and challenge for it on login.

**Screens/states:** enrollment lives at `/account/security` (this repo's existing settings page, not a separate `/mfa` route — `SCREEN_INVENTORY`'s `/mfa` was itself marked `[Inferred]`, and this repo already has an authenticated, auth-only-gated settings surface that's the more natural home, consistent with `SCREEN_INVENTORY`'s own separate D14 "Merchant Settings — Security" entry describing exactly this combination of "MFA setup, password change" in one place):
- Not enrolled → "Set up authenticator" → shows a setup key (mock: no real QR — see mock shim notes) + confirm-code field → enrolled.
- Enrolled → shows status + "Turn off."
- Challenge step lives in B1 (same flow, not a separate screen — matches `SCREEN_INVENTORY`'s B1 "MFA challenge step if enabled" note directly, rather than B5's `/mfa` implying a second, separate challenge screen).

**Session/security rules:** see resolutions #2/#3. Enrollment/un-enrollment doesn't itself revoke other sessions (only a password change does, per `Session Management`) — un-enrolling MFA is a downgrade a user might deliberately want without being logged out everywhere.

**Data collected:** a TOTP secret (server-generated, not user-entered) + a confirmation code.

**Role-specific differences:** guidance copy only (optional/Creator, recommended/Merchant, strongly-recommended/Admin, per #3) — enrollment itself is available to every role identically; nothing is currently forced.

---

## Addendum 2026-08-25 (a) — reference project reviewed, design ported, mock shim added

Read the reference project's own playbook (`C:\Users\HP\Desktop\sellviaproject\Docs\Frontend\Playbooks\01-authentication.md`) and its implemented `apps/frontend` in full.

**What that reference actually is**: its four auth pages turned out to use the *same* core architecture this repo already does — a generic Kratos `ui.nodes` renderer, not hand-built per-field forms as its own playbook implies. The real difference was visual/UX polish (password show/hide toggle, field icons, styled banner alerts, a data-disclosure note) plus a default-on mock auth provider so it runs with zero real Kratos.

**Decision (user-directed):** port the visual/UX layer only; keep this repo's own architecture (generic renderer, native form POST, `/login` `/registration` `/recovery` `/verification` route names, `proxy.ts` role-gated protection) rather than the reference's route names or client-side AJAX provider abstraction. The reference's hand-rolled `RoleSelector` was *not* ported — this repo's schema-driven `<select>` does the same job without duplicating Kratos's own role-trait validation.

**What was added to `components/ory/flow-form.tsx`** (shared by every flow page, reaching all of them at once):
- `components/ui/password-input.tsx` — show/hide toggle on every password field.
- `components/ui/alert.tsx` + `components/ui/form-error-text.tsx` — tinted-background banner for request-level messages, plain red text for field-level errors. Same `bg-*/10` pattern already used by `badge.tsx`/`button.tsx`.
- Mail icon on email fields, key icon on any field named `*code`.

## Addendum 2026-08-25 (b) — playbook completed, MFA built, mock shim extended

Read all six source docs directly (`C:\Users\HP\Desktop\sellviaproject\Docs`, see file header) and resolved every cross-cutting open question above. Built on top of addendum (a):

- **MFA (B5), genuinely new work — built end to end**: enrollment at `/account/security` (settings flow, mock-extended), login challenge as a second step of the existing `/login` flow. Both reuse the same `flow-form.tsx` rendering (so they got the password-toggle/icon/banner treatment automatically) and the same mock-shim architecture as the other four flows.
- **Recovery now hands off to settings** for the actual password change (was previously self-contained inside `/recovery`) — see B3 above; more faithful to real Kratos, and removes a second, duplicate password-policy code path.
- **`DataDisclosureNotice` rewritten** with real copy grounded in `Data Inventory & Disclosure` (resolution #5) — no longer a "don't ship this" placeholder box.
- **Mock Kratos shim (`src/lib/ory/mock/`, `src/app/api/mock-kratos/`)** extended: `getSettingsFlow`, a settings/TOTP-enrollment flow, and a login-flow `totp` challenge step, all gated behind the same `MOCK_AUTH=1` (`.env.local`, gitignored) as before — off by default, no change to real-Kratos code paths. Seeded accounts: `demo@sellvia.test` / `password123` (no MFA) and `mfa@sellvia.test` / `password123` (MFA already enrolled, for exercising the challenge step directly). Fixed dev code `123456` used for recovery/verification/TOTP alike (no real email or authenticator app in a mock).

**Unrelated gap noticed while verifying, not fixed** (out of scope for an auth-only task): `ROLE_PREFIX.merchant` (`lib/nav/config.ts`) points at bare `/merchant`, but `src/app/merchant/` has no `page.tsx` at that exact path, so a freshly-authenticated merchant lands on a 404. Pre-existing, not introduced by this task.
