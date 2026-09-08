# Playbook 02 — Onboarding Flow (Role-Aware, Post-Authentication / Pre-Dashboard)

## Status: Implemented on `feature/3-onboarding`. Not committed/pushed — awaiting review.

**Feature numbering (current, authoritative):** Feature 1 = Authentication, **Feature 2 = Onboarding**, Feature 3 = App Shell & Role Context, Feature 4 = Products / Marketplace / Campaign Loop. This playbook was originally written as "Playbook 03" under an earlier ordering; it has been renamed and renumbered to match the corrected sequence. No other playbook needed renumbering — `01-authentication.md` already referred to onboarding as "Playbook 02" at the bottom of its own document.

## 1. Purpose

After registration/login, a new user must complete onboarding before reaching the dashboard. An existing user whose onboarding is already complete must never be forced through it again. Feature 2 always opens with role confirmation (C1), then walks the user through Merchant business + billing + Shopify setup (C2/C3) and/or Creator profile + payout setup (C4), and hands off to Feature 3's App Shell/dashboard on completion. Feature 3's App Shell and dashboard are explicitly out of scope here — onboarding's only job is to gate entry and collect data, not to render a dashboard.

## 2. Product flow

```
Public SellVia website
        ↓
Feature 1 — Authentication (Sign Up / Login / Email Verification)
        ↓
Existing user, onboarding already complete → Dashboard directly
New user / incomplete onboarding
        ↓
Feature 2 — Onboarding   ← this playbook
        ↓
Onboarding Complete
        ↓
Feature 3 — App Shell & Role Context (not built yet)
        ↓
Merchant / Creator Dashboard
```

## 3. Authentication → Onboarding relationship

- Reuses Feature 1's session and its single provider seam (`authProvider`, `lib/auth/provider.ts`) as-is — no second auth/session/onboarding architecture. The one deliberate Feature 1 touch: `AppSession` gained an `onboardingComplete?: boolean` field, and `AuthProvider` gained `updateRoles(email, roles)` / `markOnboardingComplete(email)` — real for the mock provider (re-issues the session cookie), documented no-ops for the kratos provider (no confirmed identity-schema write path for either field yet). See `lib/auth/types.ts`'s doc comments.
- Role model: `merchant`, `creator`, or both (a dual-role account — not a third role, not two accounts).
- **C1 — role select always runs first**, even when Feature 1 registration already put a role in the session: the user confirms or changes it. Existing progress (an onboarding record from a prior visit) pre-fills the checkboxes and, once confirmed, routing continues from the correct next-incomplete step rather than restarting the whole flow.
- Onboarding-complete state now has two layers: the session itself (`session.onboardingComplete` — real in mock mode, authoritative) with the pre-existing dev cookie (`sellvia_onboarding_complete`) kept as a fallback for kratos mode, where there's no confirmed session-native write path yet. `lib/onboarding/status.ts`'s `isOnboardingComplete()` checks the session field first (`!== undefined`, not truthiness — a real `false` must not fall through to the cookie), then the cookie.
- `app/onboarding/layout.tsx` and `app/dashboard/page.tsx` are the two integration points: no session → `/login`; session but onboarding incomplete → `/onboarding`; session and already complete → `/dashboard` directly. This is the direct-URL bypass guard in both directions.

## 4. Screens / routes

| Step | Route | Shown when |
| --- | --- | --- |
| Role select | `/onboarding/role-select` | Always, first. C1. |
| About you | `/onboarding/about-you` | Always. Asked once per person (see §9). |
| Your business | `/onboarding/business` | Merchant role only. |
| Connect billing | `/onboarding/billing` | Merchant role only. C2. |
| Connect Shopify | `/onboarding/store-connect` | Merchant role only. C3. |
| Transition | `/onboarding/transition` | Dual-role only, between the merchant steps and creator-profile. Static, no fields, no Back. |
| Your content | `/onboarding/creator-profile` | Creator role only. |
| Payout details | `/onboarding/payout` | Always, once per person (see §9). C4. |
| Complete | `/onboarding/complete` | Always, last. Marks onboarding complete on arrival. |

All nested under `app/onboarding/layout.tsx` (server guard: no session → `/login`; already complete → `/dashboard`).

## 5. Merchant onboarding

**Step — About you** (shared, see §9) — heading "Tell us about yourself", subtitle "Let's start with a few details about you." Fields: Full name*, Email (prefilled, read-only), Phone*, Country*.

**Step — Your business** — heading "Tell us about your business", subtitle "Help us understand what you sell." Fields: Business/brand name* (text), Business category* (dropdown: Beauty, Fashion, Electronics, Food & Beverage, Health & Wellness, Home & Lifestyle, Digital Products, Education, Other), Product type* (radio: Physical products / Digital products), Website (optional URL).

**Step — Connect billing (C2)** — heading "Connect billing", explains SellVia uses Switch to collect commissions/manage campaign billing. States: NOT CONNECTED ("Billing connection required" + Connect billing CTA), CONNECTING ("Connecting billing…"), CONNECTED ("Billing connected — ready"), and a BLOCKED message ("Billing connection required before you can launch campaigns.") shown if Continue is pressed before connecting. Talks only to `lib/onboarding/integrations/billing.ts`'s `IntegrationAdapter` interface — never a concrete SDK — so the real Switch widget/redirect mechanism can replace the mock adapter later with zero UI changes.

**Step — Connect Shopify (C3)** — heading "Connect your Shopify store". Store URL input, Connect CTA, connection status (not connected / connecting / connected + webhook-active confirmation / error), troubleshooting copy on failure ("Having trouble connecting your store?" + a checklist, "Try again"/"Back"), and a static discount-code fallback-tracking explainer. Talks only to `lib/onboarding/integrations/shopify.ts`'s adapter — no real Shopify OAuth app exists yet, so "Connect Shopify" simulates the redirect boundary rather than inventing real credentials.

**Step — Payout** (shared, see §9) — see §7.

## 6. Creator onboarding

**Step — About you** (shared) — subtitle "Help us understand you as a creator." for creator-only accounts.

**Step — Your content** — heading "Tell us about your content", subtitle "Help brands understand what you create." Fields: Primary platform* (dropdown: Instagram / TikTok / YouTube / Other — single platform only, MVP doesn't force multiple), Handle/profile link* (text), Audience size* (number, ≥ 0), Niche/category* (dropdown with the standard content categories + Other).

**Step — Payout (C4)** (shared) — see §7. Includes the explicit blocking-state copy: "Finish payout setup to activate your links."

## 7. Payout step (both roles) — C4

Heading "How should we pay you?", subtitle "Add your payout details. You can update these later." Payout method* (radio: **Bank / JazzCash / EasyPaisa** — PayPal has been dropped entirely per the current requirement). Bank → Account holder name*, Account number*, Bank name* (dummy fields). JazzCash/EasyPaisa → Account holder name*, mobile wallet number* (dummy fields). CTA "Complete setup". **No real Bank/JazzCash/EasyPaisa processing** — frontend structure only, plus a mock "activation" call (`lib/onboarding/integrations/payout-provider.ts`) so the completion state is real and checkable, not just cosmetic.

The activation status this sets is what `lib/onboarding/payout-gate.ts` (`isPayoutActive`, `PAYOUT_INCOMPLETE_MESSAGE`) exposes for Feature 4 to gate link generation on later — exported now, not wired into any Feature 4 screen yet (out of scope for this task).

## 8. Dual-role onboarding (Merchant + Creator)

Not a combined form and not a third role, and never loses either role's data — both stay attached to the same `OnboardingRecord`/account. Sequence: Role select → About you → Business → Billing connect → Shopify connect → **Transition screen** ("Great! Your merchant profile is ready." / "Now let's set up your creator profile so you can also promote products and earn commissions." / button "Continue as Creator") → Your content → Payout → Complete. Onboarding is only marked complete once every required step for both roles is done.

## 9. Design decision: About You and Payout are asked once, not once per role

The spec describes Merchant and Creator onboarding as two standalone flows (each implicitly with its own identity/payout step). Taken completely literally for a dual-role account, that means asking for name/email/phone/country twice and a payout preference twice in the same run. That contradicts the same spec's own "don't make the user feel like they're filling out a huge form" principle, and a single account only has one identity and (for MVP) one payout preference. So both are collected once, shared across whichever role step(s) follow. Flagged here explicitly — easy to revert to the literal per-role repeat if that's actually wanted.

## 10. Required fields & validation

| Field | Rule |
| --- | --- |
| Full name | required, ≥ 2 chars |
| Email | prefilled, read-only, not re-validated |
| Phone | required, basic phone pattern |
| Country | required |
| Business name | required, ≥ 2 chars |
| Business category | required |
| Product type | required |
| Website | optional; if present, must be a full URL |
| Shopify store URL | required to attempt connection |
| Primary platform | required |
| Handle/profile link | required, ≥ 2 chars |
| Audience size | required, number ≥ 0 |
| Niche | required |
| Payout method | required |
| Bank fields | required if Bank |
| Mobile wallet fields | required if JazzCash/EasyPaisa |

All validation is inline, friendly copy (`FormErrorText`), no browser-default validation UI (`noValidate` on every form). Continue is not disabled pre-submit (validation runs on submit, matching the rest of the app's existing pattern) but never silently accepts invalid data. Billing/Shopify additionally block Continue with an explicit message until the adapter reports "connected".

## 11. Navigation behavior

- Every real step (not Transition) has Back (optional, omitted not disabled on the first step of the run) + Continue, via the shared `OnboardingNav`.
- Back never loses data — every field is re-hydrated from the saved record on mount.
- Back from Your content skips the static Transition screen and goes straight to Connect Shopify (nothing to revise on Transition).
- Direct-URL jump-ahead is blocked by `useOnboardingStep`: hitting an unearned step redirects to the correct earliest-incomplete step. Revisiting an earlier *completed* step is always allowed.
- Loading state: a skeleton placeholder while the client-only saved record loads on mount; billing/Shopify additionally show a "connecting…" state on their own CTA.

## 12. Completion behavior

Reaching `/onboarding/complete` already implies every prerequisite passed the guard, so completion is marked on arrival: `markOnboardingComplete` (local record) + the completion cookie (kratos-mode fallback) + `authProvider.markOnboardingComplete(email)` (the session-native flag, real in mock mode) — not deferred to the button click. Copy: "You're all set! 🎉" / "Your SellVia account is ready." Button "Go to Dashboard" navigates to `/dashboard` — today that's still Feature 1's placeholder, since Feature 3's App Shell doesn't exist yet; this is the intended Feature 3 handoff point.

## 13. Persistence

`lib/onboarding/store.ts` — localStorage, keyed by email, mirrors `lib/auth/mock/user-store.ts`'s pattern exactly (no new architecture invented). `OnboardingRecord` is split into independent slices (`commonProfile` / `merchant` / `creator` / `payout` / `billingStatus` / `storeConnectionStatus` / `payoutStatus` / `complete`) so a real backend integration is a straight per-slice swap, not a redesign. Onboarding-*completion* itself is no longer purely a local/cookie concern — see §3: the session's own `onboardingComplete` field is now the primary source of truth in mock mode. No backend files touched.

## 14. Integration adapters (C2 / C3 / C4)

`lib/onboarding/integrations/types.ts` defines one shared `IntegrationAdapter` interface (`getStatus`, `connect`) used by all three swappable integration points:

- `billing.ts` — C2 Switch billing connect.
- `shopify.ts` — C3 Shopify store connect (dev convenience: a store URL containing "fail" deterministically triggers the error/troubleshooting state, so that UI is actually reachable in testing).
- `payout-provider.ts` — C4 payout activation.

Each is a mock/dev implementation only — none call a real backend or SDK. The UI (billing/store-connect/payout step views) only ever calls the interface, so swapping in the real Switch widget/redirect, real Shopify OAuth, or a real payout provider later is a one-file change per integration.

## 15. Feature boundaries

**In scope:** Role select (always shown), Merchant onboarding (business, billing, Shopify), Creator onboarding (about-you, content, payout), dual-role sequential onboarding, validation, step indicator, Back/Continue, completion (session-persisted), auth integration, onboarding guard, responsive UI, this playbook.

**Explicitly out of scope:** Merchant/Creator dashboard, sidebar/header/App Shell, role switcher, dashboard analytics, campaign creation, product listing, creator marketplace, applications, sales, earnings, real payout/billing/Shopify processing, real KYC verification, My Links UI (a shared `PayoutGateNotice` component + `isPayoutActive` check are exported for it to consume later, not wired in). All of these belong to Feature 3 or Feature 4.

## 16. Known limitations

1. **Billing/Shopify/Payout are mock adapters only** — no real Switch, Shopify OAuth, or Bank/JazzCash/EasyPaisa integration; frontend shape + swappable boundary only (§14).
2. **Kratos-mode role/completion propagation is best-effort** — `authProvider.updateRoles`/`markOnboardingComplete` are documented no-ops for the kratos provider (no confirmed identity-schema trait write path); mock mode is fully real. A role *change* on the role-select screen in kratos mode won't reach the live session (falls back to the onboarding record via `getEffectiveRoles`), and onboarding-complete falls back to the dev cookie.
3. **KYC was removed from this feature entirely** per the revised spec — no identity verification step exists in onboarding anymore. If KYC is still needed, it's a separate, not-yet-scoped requirement.
4. **Business category / niche / platform lists** are reasonable MVP pick lists, not sourced from a specific backend enum doc — flag for confirmation before they map to real backend values.
5. **About You / Payout dedup** (§9) is a design call, not a literal reading of the spec — flagged for the same reason.
6. Onboarding progress is per-browser (localStorage-backed mock) — a different browser/device mid-onboarding starts fresh until a real backend-persisted store replaces it.
7. **`lib/merchant/types.ts`'s `MerchantPayoutMethod`** (the Feature 3/4 dashboard's own payout-method editor, separate from onboarding's `PayoutData`) still models `paypal | bank` — intentionally not touched in this pass, since building/editing Feature 3/4 screens is explicitly out of scope here. Flagged for whoever picks up Feature 3/4 to reconcile with the Bank/JazzCash/EasyPaisa set.

## 17. Verification / testing checklist

| # | Check | Result |
| --- | --- | --- |
| 1 | Feature 1 authentication still works | Pass |
| 2 | New user can register | Pass |
| 3 | New user is always sent to role-select, then onboarding | Pass |
| 4 | Merchant onboarding works end-to-end (business → billing → Shopify → payout → complete) | Pass |
| 5 | Creator onboarding works end-to-end | Pass |
| 6 | Dual-role onboarding works sequentially (transition screen shown once, neither role's data lost) | Pass |
| 7 | Required fields validate with inline errors | Pass |
| 8 | Back preserves data | Pass |
| 9 | Continue advances correctly per role | Pass |
| 10 | Refresh mid-step re-hydrates saved data | Pass |
| 11 | Incomplete onboarding cannot access dashboard (direct URL) | Pass |
| 12 | Completed onboarding does not re-show onboarding on next login | Pass |
| 13 | Jump-ahead direct-URL attempts are blocked | Pass |
| 14 | Billing connect: not-connected/connecting/connected/blocked states all reachable | Pass |
| 15 | Shopify connect: success and failure (troubleshooting copy) states both reachable | Pass |
| 16 | Payout: Bank/JazzCash/EasyPaisa all submit correctly, no PayPal option present | Pass |
| 17 | Desktop / mobile / light / dark all verified | Verified |
| 18 | No Feature 3 dashboard/shell code introduced | Confirmed |
| 19 | `npx tsc --noEmit` | See implementation report |
| 20 | `npm run lint` | See implementation report |
| 21 | `npm run build` | See implementation report |
| 22 | Playbook content updated to describe C1–C4 | Done |

---

## Definition of done

- All onboarding screens exist, role-aware, styled to existing design tokens, no generic-template look.
- Role select always runs first; confirms/updates the session's roles via `authProvider.updateRoles`, not just the local record.
- Dual-role users complete both role flows sequentially with a clear transition, never losing either role's data.
- Billing (C2) and Shopify (C3) connect steps exist behind a swappable adapter interface, mock-only for now, with explicit not-connected/connecting/connected/blocked (billing) and success/failure+troubleshooting (Shopify) states.
- Payout step (C4) offers Bank/JazzCash/EasyPaisa only, clearly dummy, with an explicit activation/blocking message and a real (checkable) activation status for Feature 4 to consume later.
- Onboarding-complete is a real session-level flag in mock mode (not just a cookie), with the cookie kept only as a kratos-mode fallback.
- Dashboard is unreachable until onboarding is complete, including via direct URL; completed users skip straight to dashboard on future logins.
- Feature 1 auth flows unmodified beyond the one documented, justified session-schema addition (`onboardingComplete` field + two new provider methods).
- Feature 3 (App Shell, role switcher, dashboard chrome) untouched; Feature 4 (My Links, etc.) untouched, only a shared status export left ready for it.
- No backend files touched.

**Next feature:** Feature 3 — App Shell & Role Context (not started in this branch).
