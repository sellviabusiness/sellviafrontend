# Playbook 06 — Shared Cross-Role Features

## Status: Proposed — awaiting approval to start. Not yet implemented.

## Why this feature next

F1–F3 don't belong to Merchant or Creator alone — they sit above both (notification centre, account deletion, support contact), the same way Feature 1 (Authentication) and the account-level `/account/security` screen already sit above both. Playbooks 04/05 each built role-scoped dashboards; this playbook is the first to explicitly test whether "shared across roles" was actually kept shared, not merged into one menu (the standing rule nav config's own comments already state: "Three separate lists, never merged").

**Feature numbering (current, authoritative):** Feature 1 = Authentication, Feature 2 = Onboarding, Feature 3 = App Shell & Role Context, Feature 4 = Merchant Dashboard, Feature 5 = Creator Dashboard, **Feature 6 = Shared Cross-Role Features (this playbook)**.

## 1. Screens/flows in scope (F1–F3)

| # | Feature | Route(s) | Notes |
| --- | --- | --- | --- |
| F1 | Notification centre | Bell dropdown in both `MerchantTopbar` and `CreatorTopbar` | Read/unread, type-based icons, click-through, scoped to recipient+role. |
| F2 | Account deletion | `/account/delete` (proposed) | Confirmation naming exactly what's deleted, 14-day cancellable grace period. |
| F3 | Support/help contact | `/support` (proposed) | Contact form/link; copy must not read a normal settlement wait as a failure. |

## 2. Audit — what already exists

### F1 — Notification system

**A real one already exists, network-backed, currently unused by either new shell.** `lib/notifications/{types,api,actions}.ts` + `components/shell/notification-bell.tsx`:

- `Notification { id, title, body?, createdAt, readAt, href? }` / `NotificationSummary { unreadCount, items }` — real shapes, calling the real (currently-unreachable, `API_BASE_URL` unset) `/notifications/summary` and `/notifications/read-all` endpoints via `apiRequest`, same class of pre-existing real integration as `components/ai/*` (Playbook 04 §12 item 2) — degrades gracefully to `{unreadCount: 0, items: []}` on failure, not fake data.
- **No `type` field on `Notification` at all** — F1 asks for "type-based icons," which this shape can't support without extending it.
- **Explicitly documented as role-agnostic**, per its own comment: *"Session-scoped implicitly... one bell, shared across Merchant/Creator/Admin shells."* That's the OLD shell's model (one shared component, trusting a real backend to already filter by recipient) — it has no client-side role-scoping logic of its own, because it was never meant to need any.
- Rendered today only by the OLD `components/shell/app-shell.tsx` (Admin's current shell, and Creator's before Playbook 05 replaced it). **Both `MerchantTopbar` and `CreatorTopbar` (Playbooks 04/05) have their own bell button that's a hardcoded `disabled` placeholder** — "Notifications (not yet available)" — never wired to this system at all.
- Uses the OLD `@/components/ui/*` kit (`DropdownMenu`, `components/states/empty-state`) — same design-system mismatch already found and fixed for Creator's shell (Playbook 05 §4).

**The real architectural question this raises (see §3):** the existing system assumes a real backend does recipient-scoping server-side. This app has no real backend — every other feature (Onboarding, Merchant, Creator) ended up building a real local mock store once real data was needed for a real demo (Playbook 04's `ActivityItem`/Playbook 05's `getRecentActivityForCreator` are the closest existing analog: a merged, timestamped feed already computed per-account). F1 likely needs the same treatment, not the network-backed placeholder, to actually be demoable and to support "click-through" + "mark read" as real, persisted actions.

### F2 — Account deletion

**Nothing exists.** No route, no component, no store function, no mention in any playbook. Fully new.

### F3 — Support/help contact

**Nothing exists.** No route, no component, no mention in any playbook. Fully new.

### Settlement-window definition (F3's copy requirement)

**Not defined anywhere in this codebase or its playbooks.** Searched Playbooks 02 (C2 billing / C4 payout) and 04 (D9 billing cycles) specifically — the closest existing concept is Playbook 04 D9's `BillingCycle`: a **calendar-month** period with status `open → pending_charge → charged/failed`, and Playbook 05 E7's "billed-and-charged only" balance rule built on top of it. Neither playbook states an actual *duration* (e.g., "commission settles N business days after month end") — that number doesn't exist yet. Flagged in §7 rather than invented; F3's copy can correctly describe the real *mechanism* (monthly cycles, a balance that becomes available once a cycle is charged) without asserting a specific day-count SLA nobody has confirmed.

### Role-scoping mechanism (how F1 should hook into it)

Confirmed, current, and consistent:

- `lib/auth/role.ts`'s `getRolesHeld(session)` / `hasRole` — the one source of truth for which roles a session holds (fixed to read the current `AppSession` during the redirect-loop task).
- Each role gets its **own shell, own layout, own guard** — `merchant/layout.tsx` gates on `"merchant"`, `creator/layout.tsx` gates on `"creator"`; neither shell renders the other's nav or content. Nav config's own comment: *"Three separate lists, never merged."*
- The role dropdown (Playbook 04/05's topbar work) lets a dual-role account switch *which shell* they're viewing — it does not merge the two shells into one view at any point.
- **Conclusion for F1:** the established pattern is per-shell scoping by *which layout is currently rendering*, not a single merged inbox with client-side role filtering. A dual-role account viewing `/merchant/*` sees Merchant's own notifications; switching to `/creator/*` shows Creator's own. This is a recommendation (see §4), not yet built.

## 3. The one open architectural question F1 depends on: what generates a notification, and where does read/unread state live?

Mirrors Playbook 05 §2's flagged pattern (creatorId mapping) — same category of "the real data doesn't fully exist yet, needs a stand-in, flagged before building."

Real events already exist to notify on — Playbook 04/05's own store already produces exactly this shape of thing (`ActivityItem`: application received/approved, sale, payout). What doesn't exist: a **persisted, per-recipient, markable-read** notification list. `ActivityItem` today is ephemeral/computed fresh on every read, with no read/unread concept at all.

**Proposed default (flagged, not yet confirmed):** extend the same mock-store pattern — a new `Notification` record (recipient email + role it belongs under + type + message + link + createdAt + readAt), generated at the same moments `ActivityItem`s already are (offer published, application received/approved/rejected, sale recorded, payout requested), stored per-account (mirrors `lib/creator/store.ts`'s own-account-keyed pattern), read via each shell's own topbar. This reuses existing event-generation moments rather than inventing new ones, and gives read/unread + click-through something real to operate on. Confirm before/while building, per instruction.

## 4. F1 — Notification centre

**Icons by type** (new `NotificationType` needed, since none exists): proposed set mirrors `ActivityItem.kind` — `application_received` (merchant-side), `application_decided` (creator-side: approved/rejected), `sale` (both — a merchant gets "you made a sale," a creator gets "you earned a commission"), `payout` (creator: payout processed; merchant: N/A for now, no merchant-side payout automation exists), `billing` (merchant: cycle charged/failed, Playbook 04 D9).

**Read/unread:** a real `readAt` field, set on click-through (opening the linked screen) and via "Mark all read," same interaction shape as the existing (unused) `NotificationBell`.

**Click-through targets:** reuses existing real routes — `application_received` → `/merchant/applications/:id`, `application_decided` → `/creator/applications`, `sale` → `/merchant/sales/:id` or `/creator/my-links/:applicationId`, `payout` → `/creator/earnings`, `billing` → `/merchant/billing`.

**Scoping (per §2's conclusion):** `MerchantTopbar`'s bell reads only this account's merchant-role notifications; `CreatorTopbar`'s bell reads only this account's creator-role notifications. A dual-role account genuinely has two separate unread counts, one per shell — never summed into one merged badge (would violate the standing "never merge" rule).

**Components:** a new bell dropdown built against `components/reference/ui/*` (matching both shells' existing design language, not the old kit) — the existing `NotificationBell` is a reference for interaction shape (quiet unread dot, no numeric badge, "Mark all read") but not reused as-is, same reasoning as Playbook 05 §4's shell rebuild.

## 5. F2 — Account deletion

**Proposed location (flagged, not yet confirmed):** `/account/delete`, alongside the existing `/account/security` — account deletion is account-level, not role-level, so it belongs next to the other account-wide screen rather than duplicated into both `/merchant/settings` and `/creator/settings`. Both shells' Settings would link out to it (one shared screen, not two copies) — same "don't duplicate a shared thing per role" principle F1 is built on.

**Confirmation screen — names exactly what's deleted:** for real, not generic copy — reads this account's actual current state (roles held, offers/applications/sales counts if merchant, applications/links/earnings if creator, from the same stores Playbooks 04/05 already built) and lists it explicitly, e.g. "This will delete: your 3 live offers, 12 applications, access to Rs X pending payouts…" — not a boilerplate "all your data" line.

**14-day countdown:** a new field on the account/session record — `deletionRequestedAt` (or similar) — checked on every login: while inside the 14-day window, the account is flagged for deletion but still fully functional and a "Cancel account deletion" action is shown (in the account menu / a persistent banner, not buried). After 14 days, the mock deletion actually runs (clears the account's own data across every store it appears in — auth, onboarding, merchant, creator, notifications). Exact enforcement mechanism (a check-on-every-login sweep vs. something else) to be decided at implementation time — the requirement (real countdown, real cancel, real eventual deletion) is what's fixed here.

**Real backend caveat to flag when built:** actual data deletion across every mock localStorage store is real and buildable here; a REAL system would also need to handle in-flight payouts/billing obligations before deleting a merchant/creator account — that reconciliation logic doesn't exist and isn't invented here, flagged as out of scope same as every other "real business logic this frontend can't fully own" gap in Playbooks 02/04/05.

## 6. F3 — Support/help contact

A contact form (name prefilled from session, email prefilled, subject, message) or a direct `mailto:`/external link — exact mechanism to decide at implementation time (a form needs somewhere to submit to; no backend endpoint exists, so it may end up being a `mailto:` link or a form that writes to a local "sent messages" mock store purely for demo purposes, same honesty-first treatment as every other mocked action in this app).

**The settlement-window copy requirement (§2):** since no real duration is confirmed, F3's copy will describe the *mechanism* accurately (e.g., "Payouts are calculated at the end of each billing cycle and become available once that cycle is charged — see your Earnings page for your current cycle's status") rather than quoting an invented number of days. A dedicated FAQ-style section addressing "my payout hasn't arrived yet" explicitly reframes the normal billing-cycle wait as expected, not broken — this is the one line item where getting the tone right matters as much as the mechanism.

## 7. Needs clarification (do not guess — confirm before/while building)

1. **§3 — notification generation/persistence architecture.** The proposed default (new per-account `Notification` store, generated at existing event moments) is not yet confirmed.
2. **§5 — F2's route location** (`/account/delete` vs. duplicated per-role Settings entries) — proposed, not confirmed.
3. **§5 — 14-day countdown enforcement mechanism** — proposed (check-on-login sweep), not confirmed.
4. **§6 — F3's actual submission mechanism** (`mailto:` vs. a mock "sent messages" store vs. a plain static contact-info page) — not decided.
5. **§4's exact `NotificationType` set** — proposed (mirrors `ActivityItem.kind`), not confirmed; may need more/fewer types once F1 is actually being built against real event moments.
6. **Real settlement-window duration** — confirmed absent from every existing doc/playbook; F3 ships without asserting one, per §6, unless a real number surfaces before implementation.

---

## Definition of done (once approved and built)

- F1's bell is real, reads live per-shell/per-recipient notifications (not the old network-backed placeholder), supports read/unread + click-through, styled to match each shell's current design system.
- A dual-role account never sees a merged/summed notification badge across roles.
- F2's confirmation screen names this account's real current data, the 14-day countdown and cancel action are both real and testable end-to-end, and actual deletion is verified to clear every store the account appears in.
- F3's copy is verified to describe the real billing-cycle mechanism, not an invented SLA number.
- No backend files touched.

**Next feature:** not yet scoped — Admin views remain the only unscoped major area (Playbook 05's own closing note).
