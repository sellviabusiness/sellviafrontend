"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/reference/ui/card";
import { OfferForm, type OfferFormValues } from "@/components/merchant/offer-form";
import { TrackingLinkBox } from "@/components/merchant/tracking-link-box";
import { getOffer, updateOffer, isCommissionEditable } from "@/lib/merchant/store";
import type { NewOfferInput } from "@/lib/merchant/store";
import type { Offer } from "@/lib/merchant/types";

/** D3 (edit half) — no publish checklist here (already live), commission locked once an
 *  application has been approved. Tracking link is shown but never regenerated. */
export function EditOfferView({ email, offerId }: { email: string; offerId: string }) {
  const router = useRouter();
  const [offer, setOffer] = useState<Offer | null | undefined>(undefined); // undefined = loading, null = not found
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    (async () => {
      const [offerRes, editable] = await Promise.all([getOffer(email, offerId), isCommissionEditable(email, offerId)]);
       
      setOffer(offerRes ?? null);
      setLocked(!editable);
    })();
  }, [email, offerId]);

  if (offer === undefined) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }
  if (offer === null) {
    return <p className="text-sm text-muted-foreground">Offer not found.</p>;
  }

  const initialValues: OfferFormValues = {
    productName: offer.productName,
    price: String(offer.price),
    commissionRate: String(offer.commissionRate),
    category: offer.category,
    productType: offer.productType,
    description: offer.description,
    imageDataUrl: offer.imageDataUrl,
    shippingWeightGrams: offer.shippingWeightGrams ? String(offer.shippingWeightGrams) : "",
    shippingNotes: offer.shippingNotes ?? "",
  };

  async function handleSubmit(values: NewOfferInput) {
    await updateOffer(email, offerId, values);
    router.push(`/merchant/offers/${offerId}`);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Edit offer</h1>
        <p className="text-sm text-muted-foreground">Changes apply immediately — this offer is already live.</p>
      </div>

      <TrackingLinkBox url={offer.trackingLink} />

      <Card className="p-6">
        <OfferForm initialValues={initialValues} commissionLocked={locked} submitLabel="Save changes" onSubmit={handleSubmit} />
      </Card>
    </div>
  );
}
