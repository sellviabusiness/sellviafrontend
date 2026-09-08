"use client";

import { useEffect, useMemo, useState } from "react";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { Input } from "@/components/reference/ui/input";
import { Select } from "@/components/reference/ui/select";
import { Alert } from "@/components/reference/ui/alert";
import { RealOfferBrowseCard } from "@/components/creator/real-offer-browse-card";
import { listPublicOffers } from "@/lib/merchant/real-store";
import { listMyApplications } from "@/lib/creator/real-store";
import { ApiError } from "@/lib/api";
import type { RealOffer } from "@/lib/merchant/types";

type SortKey = "newest" | "commission" | "price";

/**
 * Real-mode counterpart to discover-view.tsx. Category filter is physical/digital (the real
 * `category` field) rather than the mock's vertical taxonomy (Beauty, Electronics, …) — real
 * offers have no such field at all. "Already applied" is real now (backend shipped a
 * creator-scoped GET /applications/mine, 2026-09-06); failing to load it just means no badges
 * show, not a blocking error — Discover itself still works off offers alone.
 */
export function RealDiscoverView() {
  const [ready, setReady] = useState(false);
  const [offers, setOffers] = useState<RealOffer[]>([]);
  const [appliedOfferIds, setAppliedOfferIds] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | "physical" | "digital">("all");
  const [sort, setSort] = useState<SortKey>("newest");

  useEffect(() => {
    (async () => {
      try {
        setOffers(await listPublicOffers());
      } catch (err) {
        setLoadError(err instanceof ApiError ? err.uiMessage : "Couldn't load offers.");
      } finally {
        setReady(true);
      }
      try {
        const applications = await listMyApplications();
        setAppliedOfferIds(new Set(applications.map((a) => a.offerId)));
      } catch {
        // Non-fatal — Discover still works, just without "already applied" badges.
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = offers;
    if (search.trim()) list = list.filter((o) => o.name.toLowerCase().includes(search.trim().toLowerCase()));
    if (category !== "all") list = list.filter((o) => o.category === category);
    return [...list].sort((a, b) => {
      if (sort === "commission") return b.commissionRate - a.commissionRate;
      if (sort === "price") return b.priceCents - a.priceCents;
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

      {loadError && <Alert variant="error">{loadError}</Alert>}

      {offers.length === 0 ? (
        <EmptyState icon={<Compass className="h-5 w-5" aria-hidden="true" />} title="No offers live yet" description="Check back soon — merchants are still setting up." />
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="w-full max-w-[240px]">
              <Input placeholder="Search by offer name…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="w-full max-w-[200px]">
              <Select value={category} onChange={(e) => setCategory(e.target.value as "all" | "physical" | "digital")}>
                <option value="all">All types</option>
                <option value="physical">Physical</option>
                <option value="digital">Digital</option>
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
                <RealOfferBrowseCard key={offer.id} offer={offer} alreadyApplied={appliedOfferIds.has(offer.id)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
