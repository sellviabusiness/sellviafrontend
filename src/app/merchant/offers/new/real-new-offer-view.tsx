"use client";

import { useRouter } from "next/navigation";
import { OfferForm } from "./offer-form";
import { setOfferStatus } from "@/lib/merchant/real-store";

/** Real-mode create flow — thin wrapper around the shared OfferForm (create mode). Product
 *  selection now happens inside OfferForm itself (backed by the Products page/catalog), not
 *  here — see OfferForm's own doc comment for why the old import-at-submit-time fallback logic
 *  was removed (superseded by the Products-first backend contract). */
export function RealNewOfferView() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Create offer</h1>
        <p className="text-sm text-muted-foreground">Creators will see this listing once published.</p>
      </div>
      <OfferForm
        mode="create"
        onSaved={async (offer) => {
          const published = await setOfferStatus(offer.id, "live");
          router.push(`/merchant/offers/${published.id}?justCreated=1`);
        }}
      />
    </div>
  );
}
