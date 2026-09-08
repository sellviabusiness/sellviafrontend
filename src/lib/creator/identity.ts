import { slugify } from "@/lib/merchant/format";

/**
 * NOT A DATA LAYER — pure derivation, no storage, no API call. Included in this file's "data
 * layer" family only because it's the single seam every mock creator-side function goes through
 * to get an id (rule: one isolated interface per concern). At handoff, this whole function is
 * DELETED, not swapped for an endpoint — the real backend issues a real user id at signup, and
 * every caller that currently does `deriveCreatorId(email)` switches to reading that id off the
 * session instead. No endpoint to document; the fix is "stop calling this function."
 *
 * TEMPORARY MAPPING — Playbook 05 §2's flagged default, approved as-is: derives a stand-in
 * `creatorId` straight from the session email (`cr_${slugify(email)}`), since no real backend
 * user-id exists yet to key applications/sales/links to. This is the ONLY place that derivation
 * happens — every Creator screen calls this rather than re-deriving its own id, so swapping in a
 * real backend-issued id later is a one-function change, not a find-and-replace across the app.
 *
 * Deliberately stable/deterministic (not stored anywhere) — the same email always produces the
 * same id, so a returning creator's applications/links/sales are still theirs on next login
 * without needing a lookup table.
 */
export function deriveCreatorId(email: string): string {
  return `cr_${slugify(email.toLowerCase())}`;
}
