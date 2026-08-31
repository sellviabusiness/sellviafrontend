"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Megaphone, Plus } from "lucide-react";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { buttonVariants } from "@/components/reference/ui/button";
import { Select } from "@/components/reference/ui/select";
import { OfferTable } from "@/components/merchant/offer-table";
import { getOffers, getApplications, getSales } from "@/lib/merchant/store";
import type { Offer, Application, Sale, OfferStatus } from "@/lib/merchant/types";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: Array<{ value: OfferStatus | "all"; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "live", label: "Live" },
  { value: "paused", label: "Paused" },
  { value: "ended", label: "Ended" },
  { value: "archived", label: "Archived" },
];

/** D2 — table of offers with status filter and inline pause/resume/end/archive. */
export function OffersView({ email }: { email: string }) {
  const [ready, setReady] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [statusFilter, setStatusFilter] = useState<OfferStatus | "all">("all");

  async function refresh() {
    const [offersRes, applicationsRes, salesRes] = await Promise.all([getOffers(email), getApplications(email), getSales(email)]);
    setOffers(offersRes);
    setApplications(applicationsRes);
    setSales(salesRes);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh().then(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh is stable enough for this read-on-mount case
  }, [email]);

  const applicationCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of applications) map[a.offerId] = (map[a.offerId] ?? 0) + 1;
    return map;
  }, [applications]);

  const saleCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of sales) map[s.offerId] = (map[s.offerId] ?? 0) + 1;
    return map;
  }, [sales]);

  const filtered = statusFilter === "all" ? offers : offers.filter((o) => o.status === statusFilter);

  if (!ready) {
    return (
      <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Offers</h1>
          <p className="text-sm text-muted-foreground">Products you&apos;re offering creators a commission on.</p>
        </div>
        {offers.length > 0 && (
          <Link href="/merchant/offers/new" className={cn(buttonVariants({ variant: "primary" }), "shrink-0")}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New offer
          </Link>
        )}
      </div>

      {offers.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-5 w-5" aria-hidden="true" />}
          title="No offers yet"
          description="Create an offer to start getting creator applications."
          action={
            <Link href="/merchant/offers/new" className={buttonVariants({ variant: "primary" })}>
              + Create your first offer
            </Link>
          }
        />
      ) : (
        <>
          <div className="max-w-xs">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as OfferStatus | "all")}>
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </Select>
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No offers match this filter.</p>
          ) : (
            <OfferTable
              email={email}
              offers={filtered}
              applicationCounts={applicationCounts}
              saleCounts={saleCounts}
              onChanged={refresh}
            />
          )}
        </>
      )}
    </div>
  );
}
