"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OfferForm } from "../../new/offer-form";
import { getOffer } from "@/lib/merchant/real-store";
import type { RealOffer } from "@/lib/merchant/types";

/**
 * Client-side fetch by offerId, mirroring RealOfferDetailView's own pattern (no server-side
 * getOffer / auth-token plumbing needed). Gates on status === "draft" once loaded — a non-draft
 * offer can't be PATCHed (409 OFFER_NOT_DRAFT), so bounce back to the detail page instead of
 * rendering a form with nowhere to submit.
 */
export function RealEditOfferView({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [offer, setOffer] = useState<RealOffer | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getOffer(offerId).then(
      (o) => {
        if (cancelled) return;
        if (o.status !== "draft") {
          router.replace(`/merchant/offers/${offerId}`);
          return;
        }
        setOffer(o);
      },
      () => {
        if (!cancelled) setOffer(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [offerId, router]);

  if (offer === undefined) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }
  if (offer === null) {
    return <p className="text-sm text-muted-foreground">Offer not found.</p>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Edit offer</h1>
      </div>
      <OfferForm
        mode="edit"
        initialOffer={offer}
        onSaved={(updated) => router.push(`/merchant/offers/${updated.id}`)}
      />
    </div>
  );
}
