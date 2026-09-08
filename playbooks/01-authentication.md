# Playbook 01 — Unified Authentication (Sign Up / Log In / Session)

## Status: Proposed — awaiting approval to start. Not yet implemented.

## Why this feature first

Every other screen in the inventory (~50 screens) sits behind a role-resolved session. There is no dashboard, campaign, discovery, or admin screen that doesn't first require "who is logged in, and what role are they acting as." Building anything else first means faking auth and redoing it later. This is also explicitly cross-cutting Feature 0.1 in `FEATURE_LIST.md`, not tied to Merchant or Creator specifically — it's neutral ground, consistent with the "don't favor one side" principle.

Scope is auth only — no dashboards, no onboarding gates (Stripe/snippet/payout), no role switcher UI. Those are separate playbooks once a session exists to hang them on.

## Source docs

`Business Logic/User Flows`, `Business Logic/User Roles`, `Security/Authentication`, `Security/Session Management`, `Security/Password Policy`, `API/API Authentication`, `UX/Navigation`, `UX/Design System`, `UX/Copy Guidelines`, `Security/Data Inventory & Disclosure`, `FEATURE_LIST.md` §0.1/§2.1, `SCREEN_INVENTORY.md` §B, `SITE_MAP.md` §2.

---

## 1. Screens in scope

| Screen | Route | Notes |
| --- | --- | --- |
| Login | `/login` | Ory Kratos-driven form. Redirect away if already authenticated. |
| Register | `/register` | Single form, role selector (Merchant / Creator / both) inline — not a separate step, per "minimal-field, low-friction" principle. |
| Forgot Password | `/forgot-password` | Email entry only. |
| Reset Password | `/reset-password` | Token-based form; on success, surface "you've been logged out everywhere else" (password change revokes all other sessions). |
| Verify Email | `/verify-email` | Authenticated-but-unverified gate screen; resend action. |
| Logout | action, not a page | Clears session, redirects to `/login` or `/`. |

**Explicitly out of scope for this playbook:** MFA setup/challenge (`/mfa`) — optional/undesigned policy, no blocking dependency on it for MVP login flow; role-switcher UI (Feature 0.2, needs a second role to exist first); onboarding gates (Stripe, tracking snippet, payout) — those start immediately after this playbook, as their own features.

## 2. Components needed

Build once, reuse everywhere auth-adjacent:

- **AuthCard** — centered card shell (black bg, thin border, 12px radius) wrapping every auth form — shared across Login/Register/Forgot/Reset.
- **AuthFormField** — labeled input (real `<label>`, not placeholder-only) with `aria-describedby`/`aria-invalid` wiring for validation errors — reused for email/password everywhere.
- **RoleSelector** — Merchant / Creator / both toggle, inline in Register. New — no existing pattern to reuse yet, but shape it so it's reusable later if a role-switcher (Feature 0.2) wants the same visual language.
- **FormErrorText** — inline field error, plus a top-of-form banner variant for request-level errors (invalid credentials, account locked). Copy per Copy Guidelines: specific, no "something went wrong."
- **PrimaryButton / SecondaryButton** — lime CTA + neutral variant, shared across the whole app, not just auth.
- **DataDisclosureNote** — small contextual notice on Register ("what we collect and why") per §7.3 — plain-language, inline, not a ToS link-out.

Where possible, lean on Ory Kratos's own hosted/embedded flow components rather than hand-building password-reset-token logic — confirm during implementation whether we use Kratos's self-service UI or fully custom forms against the Kratos API (open item, see §6).

## 3. Routes

```
/login
/register
/forgot-password
/reset-password
/verify-email
```

All five are public-only (redirect to `/dashboard` if a valid session already exists), flat, no nesting — consistent with the "no dropdowns, no deep menus" navigation principle extended to routing.

## 4. API / backend dependencies

- Ory Kratos self-service flows: registration, login, session issuance/verification, password reset, email verification (REST API — Kratos SDK or direct HTTP calls, TBD in implementation).
- Backend resolves role(s) from Kratos identity `traits` server-side after auth completes — frontend never sets or trusts a client-side role value.
- Session cookie/token attached on every subsequent request; 14-day max lifetime, no refresh-around-it.
- **No custom backend auth endpoints to build** — this is Kratos-fronted, backend's role is reading Kratos sessions, not issuing its own.

**Backend note (informational only, not ours to build):** role resolution and session verification live in `apps/backend`. Nothing here requires touching it — the frontend calls Kratos directly for the auth flows and reads the resulting session.

## 5. States

| State | Login | Register | Forgot/Reset | Verify Email |
| --- | --- | --- | --- | --- |
| Loading | session check on mount | — | — | pending check |
| Empty | n/a | n/a | n/a | n/a |
| Error | invalid credentials, locked account | email taken, weak password | invalid/expired token | expired link (resend action) |
| Success | → redirect to `/dashboard` (role-resolved) | → redirect into onboarding | confirmation message | verified → redirect to `/dashboard` |
| Special | MFA-challenge (stub only — full MFA is out of scope) | — | "logged out everywhere else" notice after reset | — |

Error copy must be specific per Copy Guidelines (e.g. "That email or password isn't right" not "Something went wrong") and map from the structured `{ error: { code, message, status } }` shape — never surface a raw code or stack trace.

## 6. Mobile

Public-facing entry points (Login/Register especially — reachable from the marketing site's "Join Waitlist"-adjacent flows) must work well on mobile: single-column card, full-width inputs, no horizontal scroll, tap targets ≥ 44px. No documented breakpoints exist yet (`SCREEN_INVENTORY.md` flags this as **Needs clarification**) — default to a standard mobile-first Tailwind breakpoint set (`sm/md/lg`) unless told otherwise.

## 7. Light / dark mode

**No light mode exists in the documentation.** The design system (`UX/Design System`) specifies a fixed black (#000000) background with lime accent as the entire visual identity — not a dark theme alongside a light one, just *the* theme. There is no toggle, no light-mode token set, no mention of one anywhere in `Docs/`.

**Flagging, not guessing:** if a light mode is actually wanted, that's a new requirement not in scope of the documented design system — needs your explicit call before any component is built with light-mode tokens baked in. Default assumption for this playbook: dark-only, per design.md, no toggle.

## 8. Accessibility (binding, per §0.5)

- Full keyboard operability through every form; visible lime focus rings.
- Every input has a real associated `<label>`.
- `aria-invalid` + `aria-describedby` on validation errors.
- `aria-live` region for async status changes (e.g. "verifying token…", login error appearing after submit).
- Lime-as-text contrast is unverified project-wide (flagged risk in `FEATURE_LIST.md` §0.5) — do not use lime for body/error text in these forms; reserve it for the primary CTA button only until contrast is verified.

## 9. Needs clarification (do not guess — confirm before/while building)

1. Whether Kratos's own self-service hosted UI/components are embedded directly, or fully custom forms are built against the Kratos API (`Frontend Architecture` says "Kratos SDK/components," but the exact integration shape isn't specified).
2. Social login provider(s) — mentioned as "optionally" available, provider unnamed.
3. Whether "remember me" / long-lived sessions exist within the 14-day ceiling, or every session is fixed-length.
4. MFA: optional for Creator, recommended for Merchant, possibly mandatory for Admin — exact enforcement point undecided (deferred out of this playbook's scope, but Login's design should leave room for an MFA-challenge step later without rework).
5. Where the plain-language data-disclosure note's exact copy comes from (legal-reviewed text vs. drafted here) — placeholder copy only until confirmed.

---

## Definition of done for this playbook

- Login, Register (with inline role selection), Forgot Password, Reset Password, and Verify Email screens exist, styled to design.md tokens, fully keyboard-operable.
- Sessions issue/verify correctly against Ory Kratos; role(s) read from the resolved session, never client-supplied.
- Redirect behavior correct in both directions (unauth'd user hitting a protected route → `/login`; auth'd user hitting `/login` or `/register` → `/dashboard`).
- All states in §5 implemented with copy matching Copy Guidelines.
- Mobile layout verified at a small viewport.
- No backend files touched.

**Next feature (not started):** once a session reliably exists and role is resolved, the natural Feature 2 is Merchant/Creator Onboarding gates (Stripe billing card + tracking snippet for Merchant, Stripe Connect payout for Creator) — those gate whether a dashboard has anything real to do. Proposing that as Playbook 02 after this one ships.
