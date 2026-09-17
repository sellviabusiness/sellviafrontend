import { apiRequest } from "@/lib/api";
import type { MerchantSearchResults, CreatorSearchResults } from "./types";

/** One endpoint, response shape picked by the caller via `T` — the backend already knows which
 *  shape to return from the same Bearer token every other real-store call already sends, exactly
 *  like /applications/mine. Callers pass `MerchantSearchResults` or `CreatorSearchResults`
 *  depending on which panel is rendering (GlobalSearch's own `role` prop), never both. */
export async function search<T extends MerchantSearchResults | CreatorSearchResults>(q: string): Promise<T> {
  return apiRequest<T>(`/search?q=${encodeURIComponent(q)}`);
}
