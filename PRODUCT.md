# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Merchants** — sell products online. SellVia doesn't host checkout: the customer buys on the merchant's own site, tracked via a snippet the merchant installs. Both independent/small sellers and larger established brands (confirmed: no strong lean toward either).
- **Creators** — content creators/influencers. They discover approved merchant offers, get a personalized trackable link and discount code, promote it, and earn commission on the resulting sales.
- **Admins** — internal SellVia staff handling trust/safety and financial-integrity operations: moderation, fraud signals, refunds, chargebacks, reconciliation, and an AI-driven "Command Console" that can take real platform actions (explicitly treated as the one surface where wrong-by-default is unacceptable).

**Confirmed this session:** an account is Merchant *or* Creator, never both — one role per account. This reverses an earlier "dual-role account" design that some of this repo's own code comments and playbooks still describe; those are now stale, not current product truth.

## Product Purpose

SellVia is an affiliate/influencer-marketing platform connecting e-commerce merchants with content-creator affiliates. A merchant lists an offer; approved creators get a trackable link and discount code; the sale happens on the merchant's own site (SellVia never hosts checkout); SellVia calculates and periodically bills commission through its billing/payout processor (referred to internally as "Switch" — a rename of "Paddle" carried consistently through this build).

## Positioning

Not yet settled — explicitly left open rather than invented. No confirmed claim yet for why a merchant or creator would pick SellVia over a generic affiliate network or influencer marketplace.

## Operating Context

- Merchant installs a tracking snippet on their own site; a sale is "reported," not instantly/live-verified.
- Commission is calculated and billed periodically (billing cycles), not split live per transaction.
- An offer can't go from draft to live until both the tracking snippet is verified and Switch billing is complete.
- Merchant onboarding includes connecting their store (Shopify store-connect).
- Creator payout uses Pakistan-specific local rails: bank transfer, JazzCash, or EasyPaisa.
- Admin's "Command Console" is a natural-language interface that can take real platform actions — a financial-integrity/trust-and-safety surface, not a growth/UX one.

## Capabilities and Constraints

- Auth: Clerk in production; a local zero-dependency mock provider is the dev default (no real backend required to run the app).
- Backend: a separate FastAPI service (not in this repository) backs identity verification and role grants; most dashboard data today is still a local mock/file-backed store, not yet wired to the real backend.
- No real payment/payout processing exists yet — payout setup in onboarding is an explicit dummy/mock flow.
- Real click/attribution tracking infrastructure is a known backend/database gap, not yet built — dashboards reflect whatever the current mock/partial data allows.
- An account holds exactly one commercial role: Merchant or Creator, never both. Admin is a separate, exclusive role, never combined with either.
- Onboarding is a mandatory, session-gated prerequisite before any role-specific dashboard route is reachable.

## Brand Commitments

Name: SellVia. Logo assets exist (`public/logo.png`, `public/logo-light.png`, light/dark variants). No further voice/personality commitments confirmed beyond what the shipped design system already expresses (Outfit for headings/CTAs, Figtree for body/forms/labels).

## Evidence on Hand

None. Pre-launch — no real customers, testimonials, case studies, or press exist yet. Future work must not fabricate any of these.

## Product Principles

- Trust and financial integrity outrank growth polish on admin/moderation/financial surfaces — an over-cautious rule beats a wrong automated call on someone's earnings.
- One account, one commercial role — Merchant or Creator, never both; Admin is separate and exclusive.
- SellVia coordinates, tracks, and bills commission — it never touches checkout or payment processing directly.
- Ship real, working flows even where backend integration is incomplete; a mock/dummy stand-in is fine, a UI that pretends a real integration exists where none does is not.
- Serve both small independent sellers and larger established brands — no assumption of scale baked into the product.

## Accessibility & Inclusion

No formally required standard confirmed. Observed practice throughout the shipped code already treats accessibility as a first-class concern (associated form labels, `aria-live` status regions for async errors, `aria-describedby` field-error wiring, real semantic radio/checkbox usage) — hold that bar; no specific WCAG level has been set as a requirement.
