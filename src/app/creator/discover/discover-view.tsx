"use client";

import { useEffect, useMemo, useState } from "react";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { Input } from "@/components/reference/ui/input";
import { Select } from "@/components/reference/ui/select";
import { OfferBrowseCard } from "@/components/creator/offer-browse-card";
import { getAllLiveOffersForDiscovery, getApplicationsForCreator } from "@/lib/merchant/store";
import { deriveCreatorId } from "@/lib/creator/identity";
import { OFFER_CATEGORIES } from "@/lib/merchant/constants";
import type { Offer } from "@/lib/merchant/types";

type SortKey = "newest" | "commission" | "price";

/**
 * E2 — same filter/sort surface as public discovery (no public browse page exists yet to mirror
 * exactly — playbooks/05-creator-dashboard.md §21.4 flags this — so this is built fresh: search
 * by name, category filter, sort by newest/commission/price), plus a real "already applied"
 * indicator per offer. AI-matched ranking is explicitly deferred (E2), not built here.
 */
export function DiscoverView({ email }: { email: string }) {
  const [ready, setReady] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [appliedOfferIds, setAppliedOfferIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<SortKey>("newest");

  useEffect(() => {
    const creatorId = deriveCreatorId(email);
    (async () => {
      const [offersRes, applicationsRes] = await Promise.all([getAllLiveOffersForDiscovery(), getApplicationsForCreator(creatorId)]);
       
      setOffers(offersRes);
      setAppliedOfferIds(new Set(applicationsRes.map((o) => o.offer.id)));
      setReady(true);
    })();
  }, [email]);

  const filtered = useMemo(() => {
    let list = offers;
    if (search.trim()) list = list.filter((o) => o.productName.toLowerCase().includes(search.trim().toLowerCase()));
    if (category !== "all") list = list.filter((o) => o.category === category);
    return [...list].sort((a, b) => {
      if (sort === "commission") return b.commissionRate - a.commissionRate;
      if (sort === "price") return b.price - a.price;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [offers, search, category, sort]);

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Discover</h1>
        <p className="text-sm text-muted-foreground">Browse live offers and apply to start earning commission.</p>
      </div>

      {offers.length === 0 ? (
        <EmptyState icon={<Compass className="h-5 w-5" aria-hidden="true" />} title="No offers live yet" description="Check back soon — merchants are still setting up." />
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="w-full max-w-[240px]">
              <Input placeholder="Search by offer name…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="w-full max-w-[200px]">
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="all">All categories</option>
                {OFFER_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div className="w-full max-w-[180px]">
              <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                <option value="newest">Newest</option>
                <option value="commission">Highest commission</option>
                <option value="price">Highest price</option>
              </Select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No offers match your filters.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((offer) => (
                <OfferBrowseCard key={offer.id} offer={offer} alreadyApplied={appliedOfferIds.has(offer.id)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
