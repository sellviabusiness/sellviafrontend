# Playbook 07 — Admin Panel

## Status: Proposed — awaiting approval to start. Not yet implemented.

## Sources read before writing this (real docs, not placeholders)

Unlike every prior playbook this session, the private `docs/` submodule was reachable this time — not via this repo (still `repository not found`, confirmed re-attempted), but via the sibling reference project (`C:\Users\HP\Desktop\sellviaproject\docs\`, the same legitimate repo this whole build has been sourced from). Read in full: `Scratch/SCREEN_INVENTORY.md`, `Analytics/Dashboards`, `Product Foundation/Success Metrics`, `Operations/Moderation`, `Security/Fraud Prevention`, `Operations/Admin Panel`, `Operations/Live Production Access for Support (Command Console)`, `Payments/Refund Handling`, `Payments/Chargebacks`, `Payments/Reconciliation`, `Product Foundation/Product Roadmap`, `Analytics/Activation, Aha Moment & Churn Signals`, `Operations/Founder AI Command Console`, `Analytics/Automated Monthly P&L`, `Analytics/Unit Economics (Revenue vs Cost per User)`, `Analytics/AI Token Usage Tracking`. Everything below with a doc citation is real, not inferred — genuinely-open questions from those docs are reproduced as such, not resolved here.

**Terminology note:** the docs say "Paddle" throughout (billing/payout processor, dispute handling, balance transactions). This build already renamed that provider to **Switch** starting with Playbook 02 (C2/C4) and carried through Playbooks 04/05 (D11/E9, billing cycles, payout adapters) — G5/G6/G10 below use "Switch" for consistency with the rest of this codebase, not a re-interpretation of the docs' intent.

**Feature numbering (current, authoritative):** Feature 1 = Authentication, Feature 2 = Onboarding, Feature 3 = App Shell & Role Context, Feature 4 = Merchant Dashboard, Feature 5 = Creator Dashboard, Feature 6 = Shared Cross-Role Features, **Feature 7 = Admin Panel (this playbook)**. (Your message called this "Feature 6" — Shared Cross-Role Features already claimed 6 in Playbook 06's own numbering, approved and built last turn, so this is 7.)

## 1. Why this feature next, and why it's different from every prior one

G1–G10 are the first screens in this build that are explicitly **trust/safety and financial-integrity surfaces**, not growth/UX ones — moderation, fraud signals, refunds, chargebacks, reconciliation, and a natural-language interface that "can take real actions on the platform" (your own words). The docs are unusually blunt about the same thing: Fraud Prevention calls a wrong ML call on someone's earnings "a worse failure mode than an over-cautious rule"; the Command Console doc spends more words on what it must refuse to do than on what it does. This playbook follows that lead — G9 gets its own detailed section (§4) precisely because it's the one screen wrong-by-default is unacceptable.

## 2. Audit — what already exists

| Area | Found | Assessment |
| --- | --- | --- |
| `app/admin/layout.tsx` | Exists, real guard: `getServerSession` (current system — already fixed in the redirect-loop task), `hasRole(session, "admin")`, redirects to `resolveFallbackHome` if the session lacks the role. | Session/guard logic is correct and current. Still wraps children in the **old** `components/shell/app-shell.tsx` (same old-vs-new design-system split already found and fixed for Creator in Playbook 05 §4) — `ROLE_NAV.admin` is a single placeholder "Overview" entry, not real nav for 10 screens. |
| `app/admin/page.tsx` | Exists, dead stub ("Placeholder — real admin sections pending a sitemap doc"), old `@/components/ui/*` kit. | No real screen exists. G1–G10 have no files at all yet. |
| `lib/admin/*`, `components/admin/*` | Do not exist. | Fully new data layer and UI needed. |
| **Can any account actually reach `/admin/*` today?** | **No.** `ROLES` includes `"admin"` (`lib/auth/role.ts`) and the guard checks for it correctly, but the registration `RoleSelector` (Feature 1) only ever offers `merchant`/`creator` checkboxes — there is no UI path, seed account, or mock mechanism anywhere in this codebase that ever grants a session the `"admin"` role. | **This is the one real blocker before anything in G1–G10 is even reachable to build against or demo**, flagged in §6 rather than silently worked around. |

## 3. G1–G8, G10 — screens, states, data, edge cases (per the real docs)

### G1 — Admin Dashboard (`/admin/dashboard`)

Per `Analytics/Dashboards` + `Product Foundation/Success Metrics`, this is named explicitly as **"the single most important view during Validation/Private Beta."**

- **Active merchants** — merchants with ≥1 live offer in the last 30 days (real doc definition, computable today from `lib/merchant/store.ts`'s `Offer.status`/`createdAt`, scanned across all accounts).
- **Active creators** — creators with ≥1 approved application or active link in the last 30 days (computable from `Application.status`/`decidedAt` across accounts, same cross-account scan pattern `getAllLiveOffersForDiscovery`/`getApplicationsForCreator` already use).
- **Liquidity ratio** — active creators : active merchants, "to catch one-sided growth early." Real, computable ratio from the two numbers above.
- **Time-to-payout trend** — doc: "watching this stay fast is watching the core trust promise hold up." Computable from `BillingCycle`/`PayoutRequest` timestamps already built (Playbook 04 D9, Playbook 05 E7).
- **Funnel views, both Merchant and Creator paths** — doc (`Success Metrics`): waitlist→activated, offer-listed→first-application, application→approved, click→cart→purchase, sale→payout-settled. This build has no waitlist system and no cart-add-to-purchase funnel *rate* computed anywhere yet (Playbook 05 E6 has raw click/cart-add/purchase *events*, not a funnel *rate* view) — buildable from existing events, not existing today as a rate.

### G2 — Moderation Queue (`/admin/moderation`)

Per `Operations/Moderation` + `Security/Fraud Prevention`:

- **Process (real, from the doc):** Fraud Prevention's rules flag a Sale/Application/account → queue → Admin reviews against the *specific rule* that triggered it → clear (false positive) or act (suspend/reverse/ban) → every action captured in an audit log.
- **Fraud rules to implement** (doc, MVP = rules-based, explicitly *not* ML — "there isn't enough real transaction data yet to train anything meaningful"): velocity checks (abnormal clicks in a short window), self-referral detection (creator's own payment method/IP matching the buyer), conversion-rate outliers (click-to-sale rate statistically far above norm), duplicate device/session fingerprinting, and the newer **merchant under-reporting check** (2026-08-07 update: compare reported sale volume against click volume; flag sudden reporting-pattern changes) — this last one is the fraud vector the checkout-reversal (already adopted in Playbook 04 §2b) introduced.
- **States:** unreviewed, cleared, actioned (doc's own three states).
- **Escalation:** suspected fraud with real financial loss escalates beyond routine moderation (doc names this but doesn't design the escalation path further).
- **Honest limitation the doc states outright:** none of the reporting-consistency checks *prove* a specific sale was hidden — "this is a real, structural trust gap the checkout reversal introduced, not something rules alone fully close."

### G3 — Offer Vetting Queue (`/admin/offers/vetting`)

Per `Operations/Admin Panel`: "high-commission or high-risk offers awaiting approval before going live." **Trigger thresholds for "high-commission" or "high-risk" are not defined anywhere in the docs read** — `Fraud Prevention`'s own Open Questions section says the same thing about its rules generally: *"reasonable to start conservative and tune based on real early data rather than guessing precise numbers now."* Not invented here either — see §6.

Route note: this build calls the entity "Offer" (Playbook 04's rename from "Campaign"), so the route is `/admin/offers/vetting`, not the doc's literal `/admin/campaigns/vetting` — same entity, current name.

### G4 — Admin User Management (`/admin/users`, `/admin/users/:id`)

Per `Operations/Admin Panel` + `Operations/Live Production Access for Support`:

- Search/list, user detail (activity, roles, suspend action).
- **"Support-purpose data lookup, not general browsing"** — explicit scoping language from the doc, worth carrying into the UI/copy (e.g., a visible reason-for-access convention), not just the access-control layer.
- **`get_ticket_context(user_id)`-style aggregated view** — "pulls the user's recent activity across Sales, Applications, Payouts in one call, so a responder isn't manually cross-referencing four screens per ticket." Directly buildable from this app's existing per-account cross-referencing helpers (`findApplicationById`, `getSalesForCreator`, etc.) — same shape, applied admin-side across *any* account rather than the signed-in one.
- **Suspend action** — real, no other account-state action described for MVP (no formal appeals process — doc explicitly says handle case-by-case via support at current scale, "reasonable... rather than building a formal process prematurely").

### G5 — Refund / Dispute Handling (`/admin/refunds-disputes`)

Per `Payments/Refund Handling` (revised 2026-08-07) + `Payments/Chargebacks` (revised 2026-08-07) — **two genuinely distinct flows, not one form:**

**Refund credit requests** (merchant-initiated, since the customer refund itself happens entirely outside SellVia now):
- Real process: customer refunds directly with the merchant → merchant requests a **billing credit** from SellVia (not a real Switch refund — SellVia was never in that transaction) → **capped at 5 credits per calendar month per merchant** → beyond 5, no further credit that month.
- **Partial refunds are proportional** — a partial return credits proportionally, not a full credit.
- **Correction this playbook is flagging against the existing build:** Playbook 04 D8's `requestRefundCredit` (already shipped) caps at *one request per sale*, not *5 per calendar month per merchant* — the real doc's actual rule. This is a genuine mismatch to fix when G5 is built, not a re-interpretation; noted here so it isn't missed.

**Chargebacks** (bank-initiated dispute, a *different* process per the doc — "needs its own handling, not just a variant of refunds"):
- Switch notifies via webhook → funds held/reversed → merchant (or SellVia on their behalf) submits evidence within Switch's window → if lost, merchant loses the sale amount + the Switch dispute fee; **creator commission is never clawed back regardless of outcome** (explicit 2026-08-07 correction in the doc).
- **5-dispute lifetime grace allowance per merchant** (founder-confirmed): first 5 lost chargebacks, SellVia absorbs the dispute fee (`lifetime_disputes_lost` counter); 6th onward, the fee is deducted from the merchant's balance.
- Nothing resembling a chargeback/dispute record exists anywhere in this codebase yet — fully new data model.

### G6 — Reconciliation Review (`/admin/reconciliation`)

Per `Payments/Reconciliation` (revised 2026-08-07) — **the most important honesty note in any doc read for this playbook:**

- Real process: a periodic job compares internal Sale/Commission/Fee/Payout records against Switch's own transaction records; mismatches get flagged for Admin review.
- **What changed with the checkout reversal (already adopted in this build):** reconciliation used to be a genuine cross-check against an independent record of the *underlying sale itself*. **It no longer can be** — "SellVia has no independent record of the underlying sale at all — only what the merchant's snippet reported." Reconciliation can still verify the *billing and payout legs* against Switch (did the merchant actually get charged, did creators actually get paid correctly) — it cannot independently confirm a reported sale really happened. That trust now sits entirely on G2's merchant-reporting fraud checks, not on this screen. Flagged explicitly in the doc as "a real trade-off... not something this doc can quietly compensate for" — carried into this playbook the same way, not softened.

### G7 — Waitlist / Beta Invitation Management (`/admin/waitlist`)

Per `Product Foundation/Product Roadmap` (both resolved 2026-08-07):

- **Cohort size: 10–25 merchants/creators combined**, first-group cap (founder-confirmed, not a guess).
- **First cohort: manually curated** — "chosen specifically to build a coherent cluster around the eventual beachhead niche... a deliberate, one-time exception to the automate-everything principle."
- **After the first cohort: fully automatic, strict signup order, zero curation.**
- No waitlist signup system exists anywhere in this codebase (the public marketing site with a waitlist form is out of scope for everything built so far — this app starts at `/login`/`/register`). **This screen has nothing to curate from without a waitlist data source existing first** — flagged in §6.

### G8 — At-Risk New Users (`/admin/at-risk-users`)

Per `Analytics/Activation, Aha Moment & Churn Signals` (2026-08-04 addition) — the most concretely-specified G-item of all of them:

- **Activation action, per role** (real, doc-defined, and this build already has the exact underlying events): **Merchant = publish first offer** (`createOffer`, Playbook 04) — not just create one, a live offer. **Creator = submit first application** (`applyToOfferAsCreator`, Playbook 05) — deliberately *not* "get approved," since approval depends on the merchant, not the creator's own behavior.
- **Aha moment, deliberately separate from activation:** Merchant = first sale through their offer; Creator = first commission earned. Doc: "measuring time-to-aha as its own metric matters because it can be long even when activation is fast."
- **Detection is rule-based, scheduled, not AI:** an hourly job checks for users created 24–25h / 48–49h ago with no core-action event and no nudge already sent for that tier, per this exact pseudocode from the doc:
  ```
  Every hour:
    Find users created 24-25h ago with no campaign_published/application_submitted event
      AND no 24h nudge already sent → trigger 24h nudge
    Find users created 48-49h ago with no core action completed
      AND no 48h follow-up already sent → trigger 48h churn follow-up, flag as at-risk
  ```
- **This screen shows exactly the 48h tier** — "the 48h tier doubles as a churn-risk flag." A real hourly scheduled job is backend/cron territory (flagged in §6, not faked client-side, same discipline as Playbook 06 F2's 14-day deletion sweep) — but the underlying *query* (which accounts crossed 48h with no core-action event) is a real, computable read against existing `Offer`/`Application` timestamps even without a real cron running it.
- Doc distinguishes this explicitly from moderation: "a growth signal, not a trust/safety one" — kept as its own G-item, not folded into G2.

### G10 — Admin Analytics (`/admin/analytics/*`)

Per `Analytics/Automated Monthly P&L`, `Analytics/Unit Economics`, `Analytics/AI Token Usage Tracking`:

- **Monthly P&L formula (real, from the doc):** `Revenue (platform fees collected) − Costs (Switch processing fees + hosting/infra + AI/token costs + other SaaS)`.
- **Switch's own processing fee is a real, separate cost line** ("~2.9% + $0.30 per charge, varies") distinct from SellVia's own 2% platform fee — "actual margin per sale is thinner than the 2% figure alone suggests."
- **Data sources, per the doc's own automation-level table:** platform fee revenue (fully automatic, internal), Switch processing fees (automatic, via Switch's API), hosting costs (automatic where the host exposes a billing API, manual entry fallback otherwise), AI/token costs (automatic, `ai_usage_events`), other SaaS (**manual monthly entry** — doc calls this "a realistic limitation, not a gap to pretend away").
- **Finalized vs. draft distinction** (your task's own explicit requirement, and the doc's own recommendation): "a 'finalized' flag with a separate adjustment entry for anything discovered after the fact, rather than editing a closed month in place."
- **Unit economics — asymmetric by role, real and important:** Merchant revenue = their share of platform fees (real SellVia revenue). **Creator revenue is $0 by design** — doc: *"Reporting 'revenue per creator' as a number would be misleading — track GMV driven per creator instead."* Cost-per-user splits into directly-attributable (Switch fees, AI costs tied to that user) and allocated (hosting ÷ active users, "deliberately simple... not usage-weighted"). Net contribution is Merchant-only; Creators are evaluated against GMV driven, not netted against a revenue figure that doesn't exist.
- **AI/token cost tracking — per-call, not aggregated at write time:** every AI call logs `{feature, tokens_in, tokens_out, cost_cents, related_user_id, related_entity_type, created_at}` — "consistent with a general preference for auditable, granular financial-adjacent records over pre-aggregated numbers." Feeds per-feature dashboards, unit economics, and the P&L's AI-cost line, all from the same raw table. This build's only real AI integrations so far (`components/ai/copy-assist-button.tsx`, `fit-summary-panel.tsx` — Playbook 04 D3/D6, both real network calls to a currently-unreachable backend) are the only calls that would ever populate this table for real.

## 4. G9 — Founder AI Command Console: concrete, non-hand-waved spec

Per `Operations/Founder AI Command Console` + `Operations/Live Production Access for Support` — your task asked for exact terms on "confirmation on every write" and "fail closed," so here they are as directly as the docs state them, not softened into general principles.

### 4.1 What counts as a "write action" — the exact boundary

**Every tool the console can call wraps an already-existing, already-permission-checked Admin API endpoint — never raw data access.** The read/write split is not a judgment call per command; it's a property of which *tool* gets invoked:

- **Read tools (execute immediately, no confirmation):** `get_user(id)`, `get_sales(filters)`, `get_pnl(month)`, `get_ticket_context(user_id)`, `get_playbook(feature_name)`, and every other query-shaped tool — "How many active creators this month," "show me flagged sales," "why did this payout fail" all resolve directly.
- **Write tools (confirmation required, every single time, no exceptions):** `suspend_user(id)`, `approve_offer(id)`, `trigger_refund(sale_id)`, `resend_notification(...)`, `unlock_account(id)`, and any future tool that mutates state. The doc is explicit: *"regardless of how confident the interpretation seems"* — a write tool is a write tool by definition, not by how sure the model is.
- A tool is added to one list or the other **at the time it's built**, not decided dynamically by the AI at call time — the console doesn't get to reclassify a mutating endpoint as "safe enough to skip confirmation."

### 4.2 What the confirmation UI actually looks like

Per the doc's own example, verbatim: the console states **exactly** what it's about to do, including *side effects*, before asking:

> *"I'm about to suspend user X and this will cancel their 2 active offers — confirm?"*

Concretely, this means the confirmation step:
1. Names the exact tool + exact arguments about to be called (not a paraphrase — the actual `suspend_user(user_id: "...")` call).
2. States every known downstream side effect the API itself would cause (offers going inactive, links deactivating, pending payouts affected) — pulled from what the underlying Admin endpoint's own contract says it does, not guessed by the model.
3. Presents an explicit **Confirm** / **Cancel** control — not "reply yes in the chat" parsed as free text. A distinct, unambiguous UI action, so a stray "yes" earlier in the conversation can never be misread as confirming a different pending action.
4. Nothing executes between the console proposing the action and the human clicking Confirm — the UI stays in an explicit **awaiting-confirmation** state (per `SCREEN_INVENTORY`'s own state list for this screen) the whole time.

The doc's own framing for *why*: this is the AI-command equivalent of Feature 1's re-auth-for-sensitive-actions pattern — "an AI agent restating its plan before acting is the equivalent safeguard to a human re-entering their password before a sensitive change."

### 4.3 "Fail closed, never guess" — what happens on ambiguous input, concretely

Per the doc: *"If the console can't confidently map a natural-language command to a known tool, it says so and asks for clarification — it never guesses and takes a 'best effort' action."*

Concretely, in this UI:
- A **clarification-needed** state (again, one of `SCREEN_INVENTORY`'s named states for this screen) — the console does not silently pick the "most likely" tool and confirm-prompt for *that one*. It stops and asks a real disambiguating question back.
- Example the doc's own phrasing implies: "suspend this user" with no user named/selected in context does not guess at "the last user mentioned three messages ago" — it asks which user.
- This applies to **tool selection itself**, not just arguments — if a command could plausibly map to more than one tool ("remove this offer" → vet-reject vs. suspend the merchant vs. something else entirely), that ambiguity is surfaced and clarified before any confirmation prompt is even shown, not resolved by picking one and confirming it.

### 4.4 Code-change requests: a hard, separate category

A command that's really "change how the product works" (the doc's own example: *"make the payout threshold $75 instead of $50"*) is **not** a write action to confirm-and-execute at all — it's a **third category**: the console drafts a structured, human-readable spec referencing the relevant docs, for you to hand to a developer yourself. It never touches code or deploys anything. This is a hard boundary, not a permissions setting — no tool exists in this design that would let the console execute a code/config change regardless of confirmation.

### 4.5 Audit trail — non-negotiable per action

Every console-initiated action (read or write) is logged with `initiated_via: ai_console` (vs. `dashboard` / `api` for other paths) — "so a later investigation can always tell whether a given change came through the natural-language console or the standard UI." This is the same underlying admin action log G2/G4/G5 already need to exist for their own moderation/suspend/refund actions — one audit log, tagged by origin, not a separate one for AI-initiated actions.

### 4.6 States (from `SCREEN_INVENTORY`, used as the literal state machine)

`answering` (read, in progress) → resolves immediately. `awaiting-confirmation` (write, proposed) → blocks on human Confirm/Cancel, per §4.2. `executed` (write, confirmed and run) → terminal, logged per §4.5. `clarification-needed` (ambiguous) → blocks on a real disambiguating answer, per §4.3, then re-enters the flow from the top (re-evaluated as read/write/ambiguous again, not assumed to now be safe).

### 4.7 What this playbook does NOT resolve (deferred to §6, not guessed)

Whether G9 ships as part of this feature pass at all is explicitly an open call in the doc itself (*"reasonable to treat as a fast-follow after core Merchant/Creator flows are solid... worth an explicit call from you rather than assumed"*) — not resolved here. The exact LLM/tool-calling provider is also explicitly undecided in the doc. Both listed in §6.

## 5. Cross-cutting: what "Admin only, fully separate nav" means for this build

Per `SCREEN_INVENTORY`'s own global note for the whole G section: *"Access = Admin only, `/admin/*` namespace, fully separate nav"* — and its universal note for every screen in the whole inventory: **"UI is not a trust boundary: every action shown/hidden per role in these screens is a UX convenience only — the backend independently re-checks permissions on every request regardless of what a screen renders."** Worth restating for Admin specifically since this is the one role whose actions have the highest blast radius if that principle were ever skipped — this build has no real backend to "independently re-check" against (same limitation as every other role-gated action so far), so this stays a flagged, not-fully-closable gap the same way Playbook 04/05's own mock-store limitations already are, not a new one Admin introduces.

Per `Operations/Admin Panel`'s own Open Question: **single flat Admin role for MVP** — one account with access to everything in G1–G10, no tiering. Consistent with this build's existing single `"admin"` role value (no sub-roles anywhere in `lib/auth/role.ts`).

## 6. Open questions — flagged, not guessed (per your explicit instruction)

1. **No account can hold the `"admin"` role today** (§2) — the single hardest blocker before G1–G10 can be built against real data or demoed at all. Needs a decision: a dev-only seed/grant mechanism (mirroring how `DEMO_USER` already seeds a merchant account in `lib/auth/mock/user-store.ts`), or something else.
2. **G3's "high-commission"/"high-risk" offer-vetting thresholds** — genuinely undefined in every doc read, confirmed not just unwritten but explicitly flagged as an open question in the source docs themselves (`Fraud Prevention`'s own words: "reasonable to start conservative and tune based on real early data").
3. **G2's fraud-rule thresholds** (velocity/self-referral/outlier/fingerprinting) — same category as #2, explicitly undefined in the docs, not invented here.
4. **G5's refund-credit cap correction** — Playbook 04 D8 already shipped a *different* rule (1-per-sale) than the real doc's (5-per-calendar-month-per-merchant). Flagged as a fix to make when G5 is built, confirm before changing D8's existing behavior.
5. **G5's chargeback dispute-fee allocation for the 6th+ lost dispute** is resolved (passed to merchant) — but *whether the merchant is responsible for submitting evidence themselves, or SellVia does it on their behalf* is explicitly still open in the doc.
6. **G6 has no independent way to verify a reported sale actually happened** — a structural limitation of the already-adopted checkout-reversal model, not something this playbook can design around; stated here so it isn't silently treated as a solvable UI problem.
7. **G7 has no waitlist data source to curate from** — this app's flows all start at `/login`/`/register`; a public-marketing-site waitlist system isn't built anywhere in this codebase. Needs a decision: build a minimal waitlist-entry mock store as part of G7, or treat G7 as blocked until a waitlist system exists elsewhere.
8. **G8's 48h churn sweep needs a real scheduled job to run for real** — the query is real and buildable now; the hourly cron is backend territory, same discipline as Playbook 06 F2's 14-day deletion sweep (flagged, not faked client-side).
9. **G9 — whether it ships in this pass at all** is explicitly the doc's own open call, not decided here. If yes: exact LLM/tool-calling provider is also undecided (doc: "reasonable to pick once ready to build").
10. **G10's hosting-cost automation** depends on a hosting-provider choice that's itself still open in the source docs (Hetzner vs. DigitalOcean) — out of this frontend's control either way; the "manual entry fallback" is the real, buildable path regardless of which provider is eventually chosen.
11. **Whether the monthly-P&L "finalized" flag blocks all edits or just recomputation** — the doc recommends a finalized flag + separate adjustment entries rather than in-place edits, but doesn't fully specify the UI mechanics; reasonable to design at implementation time within that constraint.

---

## Definition of done (once approved and built)

- G1–G8, G10 exist, reading live from the shared mock store where the underlying data already exists (offers/applications/sales/billing cycles), clearly stubbed/flagged where it doesn't (waitlist, chargebacks, P&L cost tables, AI usage log).
- G9, if approved to build at all, implements §4's read/write/ambiguous state machine literally — no write action ever executes without an explicit, specific confirmation step naming the action and its side effects; no ambiguous command is ever silently resolved by picking the most-likely interpretation.
- Every admin action (dashboard-clicked or console-initiated) writes to one shared audit log, tagged by `initiated_via`.
- The `"admin"` role-access blocker (§6.1) is resolved before claiming any G-item is "demoable," not silently worked around per-screen.
- Every threshold this playbook flagged as undefined (§6.2, §6.3) ships without an invented number — either a real UI for admin-configurable thresholds, or an honestly-labeled placeholder, never a silently-guessed constant presented as real.
- No backend files touched.

**Next feature:** none scoped beyond this — Admin Panel was the last unscoped major area named across Playbooks 04–06's own closing notes.
