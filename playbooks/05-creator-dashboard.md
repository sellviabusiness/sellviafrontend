# Playbook 05 — Creator Dashboard

## Status: Proposed — awaiting approval to start. Not yet implemented.

## Why this feature next

Merchant Dashboard (Playbook 04) produces the data a creator needs to act on: live offers to discover, approved applications, tracking links, and sales/commission records. This playbook is the first place a creator does real work: browse offers, apply, get a link, share it, and see what it earned. It reads the SAME shared mock store Playbook 04 already writes to (`lib/merchant/store.ts`) — no second data layer.

**Feature numbering (current, authoritative):** Feature 1 = Authentication, Feature 2 = Onboarding, Feature 3 = App Shell & Role Context, Feature 4 = Merchant Dashboard, **Feature 5 = Creator Dashboard (this playbook)**.

## 1. Screens in scope (E1–E10)

| # | Screen | Route | Notes |
| --- | --- | --- | --- |
| E1 | Home | `/creator/overview` | Clicks, sales, earnings trend toward payout threshold, recent activity, application-status summary. |
| E2 | Discover / browse | `/creator/discover` | Same filter/sort surface as public discovery, plus an "Already applied" indicator per offer. AI-matched ranking is a later layer, not this pass. |
| E3 | Offer detail + apply | `/creator/discover/:id` | Application form, audience snippet, disclosure note. Distinct error states for duplicate (409), self-dealing, rate-limited. |
| E4 | My Applications | `/creator/applications` | Offer, status, date. Rejection-reason display: **open question**, see §12.1. |
| E5 | My Links | `/creator/my-links` | Offer, slug/URL, discount code, click/sale summary, copy actions. "Get Link" is the payoff moment + disclosure nudge. |
| E6 | Link detail / timeline | `/creator/my-links/:applicationId` | Click → cart-add → purchase attribution timeline for one link, commission earned from it. |
| E7 | Earnings / Wallet | `/creator/earnings` | Billed-and-charged balance only, progress to PKR payout threshold, payout history. Always live, never cached. |
| E8 | Settings — profile | `/creator/settings/profile` | Niche, audience size, engagement rate. `engagement_rate` editability: **open question**, see §12.2. |
| E9 | Settings — payout | `/creator/settings/payout` | Same Switch payee flow as onboarding C4 — reused, not rebuilt. |
| E10 | Settings — security | `/creator/settings/security` | Same MFA/session system as B5/Merchant D12 — reused, not rebuilt. |

**Explicitly out of scope for this playbook:** Merchant-facing screens, admin views, real payout processing, AI-matched Discover ranking (E2 says "layers on later"), real click/attribution tracking infrastructure (same backend/database gap flagged in Playbook 04 §12.1 — this playbook reads whatever numbers that gap leaves available, doesn't attempt to build the missing tracking pipeline).

## 2. The one open architectural question every E-item depends on: who is "this creator"?

Flagging this before anything else because it's load-bearing for E2–E7 and isn't a copy/UX question — it's a data-model gap in the existing mock store.

`lib/merchant/mock-creators.ts`'s `MOCK_CREATORS` is a **fixed roster of six demo profiles** (`cr_maya-chen`, `cr_jordan-blake`, …), used so far only as data a *merchant* reviews (Playbook 04's Applications screen). Nothing today ties a real, logged-in creator **session** (an email/account from Feature 1/2) to one of these `creatorId`s, or to any creator-owned record at all — `Application.creatorId`, `Sale.creatorId`, and `AffiliateLink` are all keyed to the mock roster, not to a session.

For E2 (apply as yourself), E4 (my applications), E5 (my links), E6 (link timeline), and E7 (earnings) to show "my" anything, this playbook needs a real answer to "what creatorId does the current session correspond to?" **Proposed default (flagged, not yet confirmed):** derive a session-scoped `creatorId` from the logged-in email itself (e.g. `cr_${slugify(email)}`), and extend `lib/merchant/store.ts`'s `applyToOffer`/queries to accept and filter on it — the same shape the mock roster already uses, just no longer limited to six hardcoded people. The demo roster stays as-is for merchant-side "creator applies" simulation (Playbook 04's own scope, unchanged). This is the first thing to confirm before E1–E10 implementation starts.

## 3. Existing-code audit (this session)

| Area | Found | Assessment |
| --- | --- | --- |
| `app/creator/layout.tsx` | Exists, already fixed this session (redirect-loop task) to use the current session (`lib/auth/session`) + onboarding-complete gate. Still wraps children in the **old** shell (`components/shell/app-shell.tsx`, `ContextSwitcher`, `RoleEmptyState`, `lib/nav/config.ts`'s `ROLE_NAV`). | Session/guard logic is correct and current. Shell is a *different, older* design system than Merchant's (Playbook 04 rebuilt Merchant's shell against `components/reference/ui/*` — Creator's shell never got that pass). Visually inconsistent with Merchant if left as-is. |
| `app/creator/discover/page.tsx`, `earnings/page.tsx`, `my-links/page.tsx` | All three are dead stub `Card`s ("Placeholder — content pending") using the **old** `@/components/ui/*` kit. `my-links` additionally renders a disabled "Get Link" button + `DisclosureNudge`. | No real screens exist. E1, E3, E4, E6, E8, E9, E10 have no file at all yet. |
| `lib/creator/*` | Does not exist. | No creator-specific data/format helpers exist — E1–E10 read `lib/merchant/store.ts` directly (per §2) plus whatever small creator-only helpers (e.g. payout-threshold math) get added there or in a new `lib/creator/` module. |
| `lib/nav/config.ts` | `ROLE_NAV.creator` lists Discover/My Links/Earnings only — no Settings entry, no route for E3/E6/E8/E9/E10. | Needs the same treatment Playbook 04 gave Merchant's sidebar (add the missing routes) — or replace entirely if Creator's shell is rebuilt against the reference design system (see §4 recommendation). |
| `components/ai/disclosure-nudge.tsx` | Exists, real (not AI-generated per its own doc comment), styled with the **old** kit's token names (`border-border`, `bg-muted/50`, `rounded-lg` — not `--radius-sm`/`--radius-md`). | Reusable as-is functionally; would need a light restyle to match reference tokens if E5 is built against `components/reference/ui/*` (recommended, see §4). |
| `components/ai/{copy-assist-button,fit-summary-panel}.tsx` | Exist, real (network-backed), already reused for Merchant D3/D6. | Not obviously needed by any E-item as specified — flagging their existence in case E3's application form wants an AI-assisted note later; not planned to be used this pass. |
| `lib/onboarding/integrations/payout-provider.ts` (C4's adapter) + `lib/onboarding/integrations/billing.ts` pattern | Exist, real, already reused once (Playbook 04 D11 reused the billing adapter for Merchant settings). | E9 reuses `payout-provider.ts` + the `ConnectionStatusBanner` component the same way — proven pattern, no new adapter needed. |
| `AuthFlowForm kind="settings"` (B5's MFA/password flow) | Exists, already reused for Merchant D12. | E10 reuses it identically — proven pattern. |
| Merchant's reference-styled shell (`components/merchant/{app-shell,sidebar,topbar}.tsx`, this session's mobile-nav drawer + role-dropdown work) | Exists, real, polished. | Not creator-specific, but the closest available *template* for what a Creator shell in the same visual language would look like — see §4. |
| `lib/merchant/store.ts` (`Offer`, `Application`, `Sale`, `AffiliateLink`, `getAllLiveOffersForDiscovery`, `getOfferStats`) | Exists, real, already covers most of what E1–E7 need to read — see §5. | The one gap is §2's creatorId question; everything else (offer fields, sale/commission math, affiliate-link shape) is already shaped correctly for a creator-side read. |

## 4. Recommendation (not yet actioned): rebuild Creator's shell against the reference design system

Given Merchant's shell was already migrated to `components/reference/ui/*` (Playbook 04) and Creator's wasn't, leaving Creator on the old `components/shell/*` system would ship two visually different dashboards for a dual-role account switching between them mid-session — a worse experience than building E1–E10 on the old system would save in effort. Proposed: a new `components/creator/{app-shell,sidebar,topbar}.tsx`, mirroring Merchant's (same mobile-nav drawer, role dropdown, avatar+name+email pattern), replacing `creator/layout.tsx`'s use of the old shell. Flagged as a recommendation to confirm before starting, not started.

## 5. Data layer plan

Everything reads/writes `lib/merchant/store.ts` (shared with Playbook 04) plus a small number of additions, once §2 is confirmed:

- `applyToOffer(email, offerId, creatorId)` — already exists; needs a real `creatorId` derivation (§2) instead of always being called with a mock roster id.
- `getApplicationsForCreator(creatorId)`, `getSalesForCreator(creatorId)` — new, mirrors the existing merchant-side `getApplications`/`getSales` but filtered/scanned across every merchant's records (applications and sales are stored per-*merchant*, not per-creator, so this is a cross-account scan — same pattern `getAllLiveOffersForDiscovery` already uses).
- `PAYOUT_THRESHOLD_PKR` (new constant, `lib/creator/constants.ts` or alongside `lib/merchant/constants.ts`) — the PKR amount E7's "progress toward payout threshold" bar measures against. Real value TBD/placeholder, same class of flagged-not-confirmed constant as `PLATFORM_FEE_RATE`.
- E6's click→cart-add→purchase timeline needs per-click/per-stage events, which the current mock store doesn't model at all (`Offer.clicks` is a single counter, not a timestamped log) — building E6 for real requires extending the mock click simulator into an event log, or E6 ships as a visibly-mocked/illustrative timeline. Flagged for the implementation pass, not decided here.
- Everything else (offer fields for E2/E3, `AffiliateLink.url`/`discountCode` for E5, `Sale.commissionAmount`/`acceptanceStatus` for E7) already exists in the current `Offer`/`Application`/`Sale` types from Playbook 04.

## 6. E1 — Home

Stat cards: Clicks (creator's own links' clicks, summed), Sales (amount attributed to this creator's links), Earnings trend toward payout threshold (progress bar/line, using §5's threshold constant), Recent Activity (application decided, new sale, link clicked — same `ActivityItem`-shaped feed pattern as Playbook 04's Overview, scoped to this creator), Application-status summary (pending/approved/rejected counts, like a compact version of E4).

## 7. E2 — Discover / browse

Reads `getAllLiveOffersForDiscovery()` (already exists, cross-account, `status === "live"` filter). Same filter/sort surface the *public* discovery page (`app/offers/[slug]`, if that's the "public discovery" referred to — needs confirming which existing screen is "public discovery" before implementation) already offers, plus one addition: an "Already applied" badge per offer card, computed from this creator's own applications (§5). AI-matched ranking explicitly deferred — plain filter/sort only this pass.

## 8. E3 — Offer detail + apply

Offer detail view (public-facing fields: name, price, category, commission, description, image) + an application form. Audience snippet: this creator's own niche/audience-size/engagement-rate (from onboarding's `CreatorDetails`, reused read-only, not re-collected). Disclosure note: `DisclosureNudge`, reused. Three distinct error states, all real (not generic failure text):

- **Duplicate application (409-equivalent):** already exists in `applyToOffer`'s own logic (`alreadyApplied` check) — currently just returns `undefined` silently; needs a real error message surfaced to the UI ("You've already applied to this offer.").
- **Self-dealing block:** a merchant applying (as a creator) to their *own* offer — needs a real check: is `offer.merchantEmail === current session email`? Not currently checked anywhere; new logic.
- **Rate-limited:** no rate-limiting concept exists anywhere in this mock store. New: either a real lightweight client-side cooldown (e.g. "wait N seconds between applications" tracked in localStorage) or an honestly-mocked "simulate rate limit" dev toggle, same spirit as Playbook 02's `?fail` Shopify convention — decide at implementation time, not guessed here.

## 9. E4 — My Applications

Table: Offer, status (pending/approved/rejected), date. Reads `getApplicationsForCreator` (§5).

**Open question, not answered here:** rejection-reason display. Nothing in the current `Application` type (Playbook 04) carries a reason for rejection — `rejectApplication(email, applicationId)` just flips status. Whether a real rejection reason should exist (merchant-entered free text? a fixed reason-code enum? nothing at all, and the UI just says "Not approved" with no explanation?) is unresolved — flagged for confirmation before E4 is built, not invented.

## 10. E5 — My Links

Table/list: Offer, slug/URL (the offer's `trackingLink` + this creator's own `?ref=` code, from `AffiliateLink`), discount code, click/sale summary (reuses `getOfferStats`-shaped math, scoped to this creator's own sales on that offer), copy actions (reuses `TrackingLinkBox`, already built for Playbook 04). "Get Link" is the payoff moment for a freshly-approved application — the existing stub's disabled button + `DisclosureNudge` already sketch this; the real version shows the link immediately once `application.status === "approved"`, styled as a small celebration (matches Playbook 02's completion-screen tone), not a plain table row.

## 11. E6 — Link detail / timeline

Per-application detail screen: a click → cart-add → purchase timeline for that one link, plus total commission earned from it. Real click/cart-add events don't exist in the current mock store (§5) — needs either a real (small) event-log extension to `recordOfferClick`, or ships as a clearly-labeled illustrative timeline (e.g. only "purchase" events are real, sourced from actual `Sale` records; "click"/"cart-add" stages shown as an honestly-mocked visual funnel above them) — flagged, decided at implementation time.

## 12. E7 — Earnings / Wallet

Balance: **billed-and-charged commissions only** — i.e. `Sale.commissionAmount` summed only where the sale's billing cycle (Playbook 04 D9's `BillingCycle`) has actually reached `"charged"`, not `"open"`/`"pending_charge"`/`"failed"`. This is a real, meaningful filter (not decorative) — it directly answers "how much can this creator actually expect to be paid," distinct from Merchant's own "totalSpend" figure which includes not-yet-billed commission. Progress bar toward the PKR payout threshold (§5). Payout history: reuses the same `PayoutRequest` shape Merchant's Payouts screen already has, scoped to this creator (new: creator-side payout requests don't exist in the store yet — same shape, new creator-scoped functions). **"Never cached — always live"**: every read goes straight through the existing localStorage-backed store functions on each render/navigation (same as every other screen in this app) — no additional caching layer to accidentally introduce, flagged explicitly so a future change doesn't add one.

## 13. E8 — Settings — profile

Edits the same `CreatorDetails` (niche, audience size) collected during onboarding (`lib/onboarding/store.ts`) — same reuse pattern as Playbook 04 D10's business-profile settings, not a second store. Engagement rate: **open question**, not answered here — `lib/onboarding/types.ts`'s `CreatorDetails` doesn't currently even have an `engagementRate` field (only `lib/merchant/mock-creators.ts`'s demo roster does, as a merchant-facing display value on the fixed six profiles). Whether a real creator's engagement rate is self-reported (editable here) or calculated from real platform data (not editable, would need a real social-platform integration this frontend can't build) is unresolved — flagged for confirmation, not assumed either way.

## 14. E9 — Settings — payout

Same pattern as Playbook 04 D11: embeds `lib/onboarding/integrations/payout-provider.ts`'s adapter + `ConnectionStatusBanner`, reachable post-onboarding, not a rebuild. (Note: Playbook 02's onboarding payout step is shared between Merchant and Creator already — "the same Switch payee flow" here means the same *adapter*, reused a second time in a Settings context, exactly like D11 did for billing.)

## 15. E10 — Settings — security

Embeds `AuthFlowForm kind="settings" allowFreshSettings` directly (same as Merchant D12) — password + MFA, not rebuilt. Same honestly-mocked "active sessions" treatment (real for this device only) as D12, reused, not reinvented.

## 16. Components (new + reused)

- **CreatorAppShell / CreatorSidebar / CreatorTopbar** (new, if §4's recommendation is approved) — mirrors Merchant's shell exactly (mobile-nav drawer, role dropdown, avatar+name+email), sidebar items = E1/E2/E4/E5/E7 + Settings in the account menu (same convention as Merchant).
- **StatCard-equivalent trend cards** — reuses the pattern Playbook 04's Overview built (`TrendStatCard`), not a new component.
- **SalesLineChart** — reused as-is for E1's earnings trend if a line visualization is wanted there.
- **TrackingLinkBox** — reused as-is for E5/E6.
- **ConnectionStatusBanner** — reused as-is for E9.
- **DisclosureNudge** — reused, restyled to reference tokens if §4 is approved.
- **OfferTable-equivalent** — a read-only variant (no pause/resume/archive actions — those are merchant-only) for E2/E4, new but modeled directly on `components/merchant/offer-table.tsx`'s real-`<table>` pattern.
- **New:** an "Already applied" badge, a payout-threshold progress bar, and (if built for real, see §11) a click→cart-add→purchase timeline component.

## 17. Routes

```
/creator/overview
/creator/discover
/creator/discover/:id
/creator/applications
/creator/my-links
/creator/my-links/:applicationId
/creator/earnings
/creator/settings
/creator/settings/profile
/creator/settings/payout
/creator/settings/security
```

All protected: `creator/layout.tsx` — no session → `/login`; onboarding incomplete → `/onboarding`; no creator role → wherever `resolveFallbackHome` sends them (existing logic, unchanged).

## 18. States

Same shape as Playbook 04 (skeleton/empty/error/success per screen), read live from the shared store, no hardcoded numbers. Empty states: "No offers match your filters" (E2), "You haven't applied to anything yet" (E4), "Get your first link" pointing at E2 (E5), "$0 earned yet" (E7, shown as a real 0, not hidden — same principle as Playbook 04 §8's "empty stats show as 0").

## 19. Mobile / accessibility

Same conventions as Playbook 04: tables scroll horizontally within their own container below `sm`; every action keyboard-reachable; `StatusBadge` always carries a text label; real `<table>`/`<th scope="col">` markup for E2/E4/E5.

## 20. Light/dark mode

Reuses the existing (now-fixed, see Playbook 04's own theme-toggle bugfix) token system — no new theme work, present in the Creator shell same as Merchant's, per the standing "Merchant and Creator dashboards only" placement rule.

## 21. Needs clarification (do not guess — confirm before/while building)

1. **§2 — creatorId/session mapping.** Blocks E2/E4/E5/E6/E7 until resolved.
2. **E4 — rejection-reason display.** Not answered here, per explicit instruction.
3. **E8 — engagement_rate editability** (self-reported vs. calculated). Not answered here, per explicit instruction.
4. **E2 — "same filter/sort surface as public discovery"**: which existing screen *is* "public discovery"? (`app/offers/[slug]` is the only public-offer-facing route found — needs confirming this is the intended reference, or that a different/not-yet-audited screen is meant.)
5. **E3 — rate-limiting**: real client-side cooldown vs. an honestly-mocked dev toggle (§8's own flagged choice).
6. **E6 — click/cart-add event log**: extend the mock store for real, or ship an explicitly-labeled illustrative timeline (§11's flagged choice).
7. **E7/PAYOUT_THRESHOLD_PKR**: real number unconfirmed, same class of placeholder as Playbook 04's `PLATFORM_FEE_RATE`.
8. **§4 — shell rebuild**: confirm before starting, since it's the single biggest scope decision in this playbook (a new shell vs. reusing the old, visually-inconsistent one).

---

## Definition of done (once approved and built)

- All of E1–E10 exist, reading live from the shared mock store, no hardcoded numbers.
- The creatorId/session mapping (§2) is real, not a placeholder that only works for the fixed demo roster.
- E3's three error states (duplicate/self-dealing/rate-limited) are each genuinely distinct, not the same generic message three times.
- E5's "Get Link" moment reads as a payoff, not a bare table row.
- E7's balance is real "billed-and-charged only" math, verifiably different from Merchant's "totalSpend" figure for the same underlying sales.
- Both open questions (§21.2, §21.3) are either confirmed and built, or explicitly still-open in the final report — never silently guessed.
- No backend files touched.

**Next feature (not started):** Admin views — not scoped by any playbook yet.
