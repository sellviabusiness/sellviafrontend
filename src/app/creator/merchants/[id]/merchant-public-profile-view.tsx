"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Store } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/reference/ui/card";
import { Alert } from "@/components/reference/ui/alert";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { SkeletonCard } from "@/components/reference/ui/skeleton";
import { RealOfferBrowseCard } from "@/components/creator/real-offer-browse-card";
import { listPublicOffers } from "@/lib/merchant/real-store";
import { ApiError } from "@/lib/api";
import type { RealOffer } from "@/lib/merchant/types";

function initials(name: string | null): string {
  if (!name) return "?";
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

/**
 * The merchant's identity plus their currently-live offers, both derived from `merchantProfileId`
 * — never from a previously-viewed offer's cached display data. There is no by-id merchant-
 * profile endpoint (backend PR #37 went with snapshotting `merchantName`/`merchantAvatarUrl`
 * directly onto Offer instead, see RealOffer's own doc comment) — this page's only real source of
 * merchant identity is the existing public `listPublicOffers()` feed, filtered client-side to this
 * one merchant, then the first matching offer's snapshot fields. If every matching offer predates
 * that PR (both fields `null`) or this merchant has no live public offers at all, there is
 * genuinely nothing to show — no invented name, no fallback to a different merchant.
 */
export function MerchantPublicProfileView({ merchantProfileId }: { merchantProfileId: string }) {
  const [offers, setOffers] = useState<RealOffer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets prior id's result before refetching by the new id
    setOffers(null);
    setError(null);
    setLoading(true);

    listPublicOffers()
      .then((all) => {
        if (!cancelled) setOffers(all.filter((o) => o.merchantProfileId === merchantProfileId));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.uiMessage : "Couldn't load this merchant's offers.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [merchantProfileId]);

  if (loading) return <SkeletonCard />;
  if (error) return <Alert variant="error">{error}</Alert>;

  const name = offers?.find((o) => o.merchantName)?.merchantName ?? null;
  const avatarUrl = offers?.find((o) => o.merchantAvatarUrl)?.merchantAvatarUrl ?? null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/creator/discover" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Discover
      </Link>

      <Card className="flex items-center gap-4 p-6">
        <Avatar size="lg">
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-[family-name:var(--font-heading)] text-lg font-semibold text-foreground">{name ?? "This merchant"}</p>
          <p className="text-sm text-muted-foreground">{offers?.length ?? 0} live offers</p>
        </div>
      </Card>

      <div>
        <h2 className="mb-3 font-[family-name:var(--font-heading)] text-base font-semibold text-foreground">Live offers</h2>
        {!offers || offers.length === 0 ? (
          <EmptyState icon={<Store className="h-5 w-5" aria-hidden="true" />} title="No live offers right now" description="Check back soon." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {offers.map((offer) => (
              <RealOfferBrowseCard key={offer.id} offer={offer} alreadyApplied={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
