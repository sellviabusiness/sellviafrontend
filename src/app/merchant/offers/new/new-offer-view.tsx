"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { OfferForm } from "@/components/merchant/offer-form";
import { TrackingLinkBox } from "@/components/merchant/tracking-link-box";
import { createOffer } from "@/lib/merchant/store";
import type { NewOfferInput } from "@/lib/merchant/store";
import type { Offer } from "@/lib/merchant/types";

/**
 * D3 — publishing sets the offer live immediately (Playbook 04 §2b demo default), auto-generates
 * the tracking link (store.ts's createOffer), and — unlike the old flow that redirected straight
 * to the list — displays that link clearly on THIS screen before moving on, per D3's explicit
 * requirement.
 */
export function NewOfferView({ email }: { email: string }) {
  const [published, setPublished] = useState<Offer | null>(null);

  async function handleSubmit(values: NewOfferInput) {
    const offer = await createOffer(email, values);
    setPublished(offer);
  }

  if (published) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <CheckCircle2 className="h-8 w-8 text-success" aria-hidden="true" />
          <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">
            &ldquo;{published.productName}&rdquo; is live
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Approved creators will share this link. Anyone who buys through it gets attributed back to them.
          </p>
          <div className="w-full pt-2">
            <TrackingLinkBox url={published.trackingLink} />
          </div>
          <div className="mt-2 flex w-full gap-2">
            <Link href="/merchant/offers" className="flex-1">
              <Button type="button" variant="secondary" className="w-full">Back to offers</Button>
            </Link>
            <Link href={`/merchant/offers/${published.id}`} className="flex-1">
              <Button type="button" className="w-full">View offer</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Create offer</h1>
        <p className="text-sm text-muted-foreground">Creators will see this listing once published.</p>
      </div>

      <Card className="p-6">
        <OfferForm submitLabel="Publish offer" requireChecklist onSubmit={handleSubmit} />
      </Card>
    </div>
  );
}
