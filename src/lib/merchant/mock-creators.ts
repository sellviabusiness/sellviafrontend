import type { MockCreatorProfile, Offer } from "./types";

/**
 * MOCK DATA LAYER — demo creator roster.
 *
 * Stands in for: nothing — this file has NO real endpoint equivalent and should be deleted
 * outright at handoff, not swapped for a real call. It exists only to simulate "a creator
 * applies" from the merchant side before real creator accounts exist (`applyToOffer` in
 * lib/merchant/store.ts). Once real creators exist, `getMockCreator(creatorId)` lookups are
 * replaced by real `GET /users/:id`-style calls (or by the `creatorEmail`/real profile data
 * already stored on `Application` — see lib/merchant/types.ts) — there's no "roster" concept in
 * the real system at all.
 *
 * Fixed demo roster simulating "a creator applies" — per instruction, real names/platforms/
 * audience sizes, not random/placeholder text. Niches reuse the same list offered on Playbook
 * 02's Creator profile step, so the data reads as one consistent product, not two systems glued
 * together.
 */
export const MOCK_CREATORS: MockCreatorProfile[] = [
  { id: "cr_maya-chen", name: "Maya Chen", platform: "instagram", audienceSize: 42000, engagementRate: 4.8, niche: "Beauty" },
  { id: "cr_jordan-blake", name: "Jordan Blake", platform: "tiktok", audienceSize: 128000, engagementRate: 6.1, niche: "Fitness" },
  { id: "cr_priya-nair", name: "Priya Nair", platform: "youtube", audienceSize: 65000, engagementRate: 3.2, niche: "Technology" },
  { id: "cr_diego-ramos", name: "Diego Ramos", platform: "instagram", audienceSize: 21000, engagementRate: 5.4, niche: "Food" },
  { id: "cr_aisha-khan", name: "Aisha Khan", platform: "tiktok", audienceSize: 89000, engagementRate: 7.0, niche: "Fashion" },
  { id: "cr_leo-martins", name: "Leo Martins", platform: "youtube", audienceSize: 34000, engagementRate: 2.9, niche: "Travel" },
];

export function getMockCreator(id: string): MockCreatorProfile | undefined {
  return MOCK_CREATORS.find((c) => c.id === id);
}

/**
 * D5's "AI fit-summary snippet" for the applications TABLE row — deliberately a fast, local,
 * deterministic template rather than the real network-backed AI panel (components/ai/
 * fit-summary-panel.tsx, which calls the real /ai/... endpoint and is used instead on the D6
 * review-detail screen, where one async card per page is the right tradeoff and a table full of
 * pending network requests isn't). Clearly a local mock, not presented as the same "real AI"
 * surface — the detail screen's panel is.
 */
export function localFitSummarySnippet(creator: MockCreatorProfile, offer: Offer): string {
  const nicheMatch = creator.niche.toLowerCase() === offer.category.toLowerCase();
  if (nicheMatch) {
    return `Strong niche match (${creator.niche}) with an active ${creator.platform} audience.`;
  }
  if (creator.engagementRate >= 5) {
    return `High engagement (${creator.engagementRate.toFixed(1)}%) despite a different niche focus.`;
  }
  return `Moderate fit — ${creator.niche} audience, worth reviewing before deciding.`;
}
