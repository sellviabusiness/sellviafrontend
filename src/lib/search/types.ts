/** GET /api/v1/search?q=<string> (2026-09-13) — role-differentiated on one path, same auth-header
 *  pattern already used for /applications/mine: the caller already knows which panel it's
 *  rendering (merchant vs. creator), so the response shape is picked via the generic type param
 *  on `search()` (lib/search/real-store.ts), not a role field to branch on at runtime. */

export type SearchOfferStatus = "draft" | "pending_vetting" | "live" | "paused" | "ended";
export type SearchOfferCategory = "physical" | "digital";
export type SearchApplicationStatus = "pending" | "approved" | "rejected";
export type SearchSaleStatus = "reported" | "accepted" | "rejected" | "billed" | "refunded";

export interface SearchOfferResult {
  id: string;
  name: string;
  status: SearchOfferStatus;
  category: SearchOfferCategory;
  commissionRate: number;
}

export interface MerchantSearchApplicationResult {
  id: string;
  offerName: string;
  creatorName: string | null;
  status: SearchApplicationStatus;
}

export interface MerchantSearchSaleResult {
  id: string;
  externalOrderId: string;
  offerName: string;
  amountCents: number;
  status: SearchSaleStatus;
}

export interface MerchantSearchResults {
  offers: SearchOfferResult[];
  applications: MerchantSearchApplicationResult[];
  sales: MerchantSearchSaleResult[];
}

export interface CreatorSearchApplicationResult {
  id: string;
  offerName: string;
  status: SearchApplicationStatus;
}

export interface CreatorSearchAffiliateLinkResult {
  id: string;
  offerName: string;
  slug: string;
}

export interface CreatorSearchResults {
  offers: SearchOfferResult[];
  applications: CreatorSearchApplicationResult[];
  affiliateLinks: CreatorSearchAffiliateLinkResult[];
}
