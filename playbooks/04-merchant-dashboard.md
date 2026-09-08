# Playbook 04 — Merchant Dashboard

## Status: Implemented (D1–D12). Not committed/pushed — awaiting review.

## Why this feature next

A resolved session (Playbook 01) tells the app who's logged in and what role they hold. Onboarding (Playbook 02) collects the business details that data-fill this dashboard. Neither produces a screen a merchant can actually *use* — this playbook is the first place a merchant does real work: create an offer, review creator applications, see sales, manage billing.

Scope is the Merchant role only. This playbook **bundles the App Shell** (sidebar, topbar, notification bell, theme toggle, role pill, account menu) rather than treating it as a separate playbook — see §2a.

**Feature numbering (current, authoritative):** Feature 1 = Authentication, Feature 2 = Onboarding, Feature 3 = App Shell & Role Context, **Feature 4 = Merchant Dashboard (this playbook)**. This file was originally written and numbered as "Playbook 03" under an earlier ordering; renamed/renumbered to match the corrected sequence, same rename Playbook 02 already went through. No content beyond the number/title changed for that reason alone.

## 1a. Two new requirements added this pass (not in the original draft)

**Requirement — Theme toggle placement.** The light/dark toggle belongs ONLY inside the Merchant and Creator dashboards (top nav, alongside the notification bell) — never on Authentication or Onboarding screens. It was previously also rendered on `AuthCard` (every login/register/etc. screen) and `OnboardingLayout` (every onboarding step) — both removed as part of this pass. Creator/Admin's shared shell (`components/shell/app-shell.tsx`) didn't have one at all — added there too, so both dashboards actually carry it, not just Merchant's.

**Requirement — Auto-generated tracking link per offer.** Creating an offer generates `https://sellvia.com/products/[product-slug]` — the slug derived from the offer/product name (lowercase, hyphenated), with a **global** uniqueness check (product links live at one flat namespace, so a collision check scoped to just one merchant's own offers isn't enough — see §5's `generateUniqueSlug`). This is the one link every approved creator shares in their bio; each gets a personalized `?ref=` copy of it on approval (§2c). **Real click tracking and attribution is explicitly a backend/database dependency this frontend cannot fully provide** — see §12 item 1 for exactly what's mocked vs. what a real implementation needs.

## 2. Product flow

```
Public SellVia website
        ↓
Feature 1 — Authentication
        ↓
Feature 2 — Onboarding
        ↓
Feature 3 — App Shell & Role Context
        ↓
Feature 4 — Merchant Dashboard   ← this playbook
```

## 2a. App Shell — bundled here, not a separate playbook

Sidebar (Overview, Offers, Applications, Sales, Billing, Payouts) + topbar (logo, notification bell — non-functional placeholder, theme toggle, role pill, account menu with Settings + logout). `components/merchant/{app-shell,sidebar,topbar}.tsx`.

## 2b. Important — checkout model, and this pass's publish-gate treatment

SellVia doesn't host checkout; the customer buys on the merchant's own site, tracked via a snippet the merchant installs. A sale is "reported," not instantly verified. Commission is calculated and billed periodically (§8's Billing cycles), not split live. A real offer can't go draft→live until (1) tracking-snippet verified and (2) Paddle billing complete.

**This build's demo simplification, refined this pass:** publish still sets an offer live immediately (`createOffer` in `lib/merchant/store.ts`) — the real server-side gates are still not modeled. What changed: the **Create Offer form now has a real two-gate publish checklist** (two checkboxes — "product details are accurate," "price and commission are confirmed" — Publish stays disabled until both are checked). This is a UI-level stand-in for the real gates, not the real gates themselves — flagged in `OfferForm`'s own doc comment, not silently upgraded to a real requirement.

## 2c. AffiliateLink — now derived from the offer's own tracking link, not generated per-approval

Old model: approving an application generated a brand-new `sellvia.link/{creator-slug}` URL. **New model (per the tracking-link requirement):** the offer already has one canonical `trackingLink` (generated at creation). Approving an application appends a `?ref=<creator-slug>-<code>` query param to that same URL — every approved creator shares the one product link, differentiated by that param, which is what a real attribution backend would key off. The Domain Model's `discount_code` fallback path is unchanged, still mock-generated per approval.

## 3. Components

- **MerchantAppShell / MerchantSidebar / MerchantTopbar** — unchanged shape, sidebar relabeled Offers (was Campaigns), Billing added.
- **StatCard, EmptyState, StatusBadge** (`components/reference/ui/*`) — unchanged, reused as-is.
- **OfferTable** (`components/merchant/offer-table.tsx`) — replaces the old card-grid (`CampaignCard`, deleted): real `<table>`, name/price/category/status/commission/application-count/sale-count, inline pause/resume/end/archive/delete menu.
- **OfferForm** (`components/merchant/offer-form.tsx`) — replaces `CampaignForm` (deleted): PKR pricing, shipping fields (hidden for digital), `CopyAssistButton` (AI copy-assist, reused as-is), two-gate publish checklist.
- **TrackingLinkBox** (`components/merchant/tracking-link-box.tsx`) — link + copy button, shared by Create/Edit Offer, Offer detail, and the approved creator's link on Application review.
- **OnboardingGateBanner** (`components/merchant/onboarding-gate-banner.tsx`) — D1's incomplete-onboarding banner.
- **ImageDropzone, PlatformIcon** — unchanged, reused as-is.
- **CopyAssistButton / FitSummaryPanel** (`components/ai/*`, pre-existing) — real network-backed AI components (call `/ai/copy-assist` and `/ai/applications/:id/fit-summary`), reused directly rather than rebuilt. Both degrade gracefully (inline message / render nothing) when the backend is unreachable, which it is in this frontend-only environment — see §12 item 2.
- **localFitSummarySnippet** (`lib/merchant/mock-creators.ts`) — a separate, local/fast, deterministic mock summary used only in the Applications *table* (one row per creator, not one network call per row); the real `FitSummaryPanel` is used on the Application *review detail* screen instead, where one async panel per page is the right tradeoff.

## 4. Routes

```
/merchant/overview
/merchant/offers
/merchant/offers/new
/merchant/offers/:id
/merchant/offers/:id/edit
/merchant/applications
/merchant/applications/:id
/merchant/sales
/merchant/sales/:id
/merchant/billing
/merchant/settings
/merchant/settings/business
/merchant/settings/billing
/merchant/settings/security
/merchant/payouts            (pre-existing placeholder — not part of D1–D12, untouched)
```

All protected: `merchant/layout.tsx` — no session → `/login`; onboarding incomplete → `/onboarding`; no merchant role → `/dashboard`.

## 5. Data layer (`lib/merchant/*`) — mock-first, same pattern as Playbooks 01/02

`types.ts` renamed `Campaign` → `Offer` (see §1a/§2c for the fields that actually changed: `slug`, `trackingLink`, `clicks`, `shippingWeightGrams`/`shippingNotes`, `status` gaining `ended`/`archived`). `Sale` gained `platformFee`, `acceptanceStatus`, `billingCycleId`, `refundCreditStatus`. New `BillingCycle` type, computed (not separately written) from `sales`.

`store.ts`:
- `generateUniqueSlug(productName)` — scans every merchant's offers (global, not per-account) for a slug collision, per §1a.
- `createOffer` — generates the slug + `trackingLink` once, at creation; never regenerated on edit.
- `setOfferStatus` — the four D2 actions (live/paused/ended/archived).
- `recordOfferClick` / `getOfferStats` — the mock click counter and per-offer stat rollup (§12 item 1).
- `approveApplication` — builds the `?ref=` link per §2c.
- `recordMockSale` — now also computes `platformFee` (flat 5% placeholder, `PLATFORM_FEE_RATE` in `constants.ts` — unconfirmed against Commission Engine, flagged).
- `acceptSale`, `requestRefundCredit` (cap: one request per sale, capped at the commission paid).
- `getBillingCycles`, `retryBillingCycle` — computed from `sales`, grouped by calendar month.
- `buildSalesCsv` — a real client-side CSV string (Sales export, §9).
- `getOverviewStats`, `getRecentActivity` — D1's stat cards and activity feed.

`mock-creators.ts` — roster gained `engagementRate`; added `localFitSummarySnippet` (§3).

## 6. Screens (D1–D12)

| # | Screen | Route | Notes |
| --- | --- | --- | --- |
| D1 | Overview | `/merchant/overview` | Stat cards (clicks/conversion/sales/spend), recent activity feed, pending-applications chip, onboarding-gate banner. |
| D2 | Offers list | `/merchant/offers` | Table, status filter, inline pause/resume/end/archive. |
| D3 | Create/Edit Offer | `/merchant/offers/new`, `/merchant/offers/:id/edit` | PKR, shipping fields hidden if digital, AI copy-assist, two-gate checklist (create only), tracking link shown on publish/edit. |
| D4 | Offer detail | `/merchant/offers/:id` | Status/commission, performance stats, application/sale summaries, pause/resume/end/edit, billing-advisory banner (§7 — this pass's "auto-paused" interpretation), tracking link + copy. |
| D5 | Applications list | `/merchant/applications` | Creator/niche/audience/engagement/local fit-summary/status, filter by status + offer. Read-only — actions live on D6. |
| D6 | Application review | `/merchant/applications/:id` | Audience data, real AI fit summary panel, Approve/Reject (synchronous, no queue), approved creator's tracking link shown. |
| D7 | Sales list | `/merchant/sales` | Date/offer/creator/amount/acceptance_status, filter by offer, sort, async-simulated CSV export (real file, not a fake download). |
| D8 | Sale detail/receipt | `/merchant/sales/:id` | Amount/commission/platform fee/merchant-keep breakdown, billing-cycle link, Request Refund Credit with cap state. |
| D9 | Billing cycles | `/merchant/billing` | Period/status/total owed/retry count, payment-method CTA on failure. |
| D10 | Settings — business | `/merchant/settings/business` | Edits the same onboarding CommonProfile/MerchantDetails records, not a second store. |
| D11 | Settings — billing | `/merchant/settings/billing` | Same C2 adapter + status banner as onboarding, reachable post-onboarding. |
| D12 | Settings — security | `/merchant/settings/security` | Same B5 `AuthFlowForm kind="settings"` (password/MFA), embedded — not rebuilt. Mock active-sessions list (real for this device only). |

## 7. Design decision — "auto-paused banner" without a real auto-pause trigger

D4 asks for an "auto-paused banner where applicable." Nothing in this build actually auto-pauses an offer (no inventory/stock system, and §2b's real draft→live gates are the explicit demo skip) — showing a banner claiming an offer *was* auto-paused when it wasn't would be dishonest UI. Instead, Offer detail shows a real, checkable advisory: if the merchant's Switch billing isn't connected, a banner says commission on new sales can't be collected and links to Settings → Billing. Flagged as a deliberate reinterpretation, not a silent guess — reachable and testable, unlike a fabricated event.

## 8. States

Same shape as before (skeleton/empty/error/success per screen) — Offers/Applications/Sales all read live from the shared store, no hardcoded numbers. Copy follows Copy Guidelines.

## 9. Sales export — real file, simulated job

`getSales()` → `buildSalesCsv()` → a real `Blob`/`URL.createObjectURL` download, behind a `setTimeout`-delayed "Preparing export…" state so the button stays interactive rather than a blocking spinner (D7's explicit requirement) — no backend job queue exists to actually poll, so the delay is what stands in for it.

## 10. Mobile / accessibility

Unchanged from the original draft: sidebar hides, topbar collapses; tables scroll horizontally within their own container below `sm`. Every new table uses real `<table>`/`<th scope="col">` markup, every action is keyboard-reachable, StatusBadge always carries a text label.

## 11. Light/dark mode

Reuses the existing token system — no new theme work. See §1a for the placement fix (Merchant/Creator only).

## 12. Known limitations — explicitly flagged backend/database dependencies

1. **Click tracking and attribution are NOT real.** `recordOfferClick` is a manual dev-only counter (a button on Offer detail literally says "Simulate a click"). A real implementation needs: a redirect/beacon endpoint at `sellvia.com/products/[slug]` that logs `(creator ref code, offer, timestamp, IP/device)` server-side, a cookie- or session-based attribution window, and a purchase-webhook (or the tracking snippet from §2b) that matches a completed sale back to that click. None of this exists or can exist purely in this frontend — it's a backend + database feature. Everything downstream that reads from it (Overview's clicks/conversion stat cards, Offer detail's stats) is real math over fake input data, clearly labeled as such in code comments.
2. **AI copy-assist and fit-summary call a real, currently-unreachable backend.** `components/ai/copy-assist-button.tsx` and `fit-summary-panel.tsx` (pre-existing, reused as-is) hit `/ai/copy-assist` and `/ai/applications/:id/fit-summary` via `lib/api/client.ts`, which throws if `API_BASE_URL`/`NEXT_PUBLIC_API_BASE_URL` isn't set (it isn't, in this environment) — both components already degrade gracefully (an inline "couldn't draft that" message / no panel at all) rather than fake a response. Not touched/mocked in this pass; will work once that backend and env var exist.
3. **Billing cycles and retries are computed, not persisted.** `getBillingCycles` derives cycles from `sales` on every read; "Retry" on a failed cycle is local component state only (not written to localStorage) — a real billing system tracks cycle/charge/retry state server-side. Flagged in the view's own doc comment.
4. **Platform fee rate (5%) is an unconfirmed placeholder** (`PLATFORM_FEE_RATE`, `constants.ts`) — not sourced from Commission Engine (unreachable), swap once confirmed.
5. **Refund Credit approval isn't modeled** — requesting one flips `refundCreditStatus` to `"requested"` and stops there; a real approve/deny flow (and the actual credit issuance) is backend territory.
6. **Active-sessions / "log out all other devices" (D12) is mostly mock** — only this browser's own session is real (read from `navigator.userAgent`); there's no server-side multi-device session store to list or revoke against yet.
7. `lib/merchant/types.ts`'s `MerchantPayoutMethod` (the pre-existing, out-of-scope Payouts screen) still isn't reconciled with onboarding's Bank/JazzCash/EasyPaisa set — pointed out in Playbook 02, still not fixed here since Payouts wasn't part of D1–D12.

## 13. Verification

| # | Check | Result |
| --- | --- | --- |
| 1 | `npx tsc --noEmit` / `next build` (TypeScript) | Clean |
| 2 | `npm run lint` | Clean |
| 3 | All D1–D12 routes render, reading live from the shared mock store | Verified |
| 4 | Offer create → tracking link auto-generated, shown on screen, globally unique | Verified |
| 5 | Application approve → creator's `?ref=` link shown immediately | Verified |
| 6 | Theme toggle present in Merchant + Creator shells, absent from Auth/Onboarding | Verified |
| 7 | Sales export produces a real downloadable CSV | Verified |

---

## Definition of done

- All of D1–D12 exist inside the App Shell, styled to existing design tokens.
- Offers replace Campaigns terminology end-to-end (types, store, routes, components) — no orphaned references.
- Tracking link generation is real (slug + global uniqueness + stable URL), click tracking is honestly mocked and flagged as a backend dependency wherever it's surfaced.
- Theme toggle is Merchant/Creator-only; Authentication/Onboarding screens no longer render it.
- Settings reuses onboarding's business-profile store, C2's billing adapter, and B5's MFA flow — no duplicate stores/flows created.
- No backend files touched.

**Next feature:** Creator Dashboard (Discover, My Links, Earnings — including the Sale detail/receipt's Creator-side mirror, §6 D8) — not started.
