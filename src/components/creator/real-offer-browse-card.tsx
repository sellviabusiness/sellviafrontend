import Link from "next/link";
import { ImageOff, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { StatusBadge } from "@/components/reference/ui/status-badge";
import { buttonVariants } from "@/components/reference/ui/button";
import { formatCurrency } from "@/lib/merchant/format";
import { cn } from "@/lib/utils";
import type { RealOffer } from "@/lib/merchant/types";

/**
 * Real-mode counterpart to offer-browse-card.tsx. "Already applied" is real now (backend shipped
 * a creator-scoped GET /applications/mine, 2026-09-06) — computed from this creator's own
 * applications, same as the mock. Every card still opens through the detail page rather than
 * applying inline, same reasoning as the mock: one real mutation call site, and the real
 * SELF_DEALING_BLOCKED/APPLICATION_ALREADY_EXISTS errors surface there before the write happens.
 */
export function RealOfferBrowseCard({ offer, alreadyApplied }: { offer: RealOffer; alreadyApplied: boolean }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden p-0 transition-colors hover:border-border-hover">
      <Link href={`/creator/discover/${offer.id}`} className="flex flex-1 flex-col gap-3">
        <div className="relative h-44 w-full shrink-0 bg-foreground/5">
          {offer.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external Shopify CDN URL
            <img src={offer.imageUrl} alt={offer.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground-2">
              <ImageOff className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs">No image</span>
            </div>
          )}
          {alreadyApplied && (
            <div className="absolute left-2 top-2">
              <StatusBadge tone="success">Applied</StatusBadge>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-3 px-5 pt-0">
          <h3 className="line-clamp-1 font-[family-name:var(--font-heading)] text-base font-semibold text-foreground">{offer.name}</h3>
          <p className="text-sm capitalize text-muted-foreground">{offer.category}</p>
          <div className="mt-auto flex items-center justify-between text-sm">
            <span className="text-foreground">{formatCurrency(offer.priceCents / 100)}</span>
            <span className="text-muted-foreground-2">{offer.commissionRate}% commission</span>
          </div>
        </div>
      </Link>

      <div className="p-5 pt-3">
        {alreadyApplied ? (
          <p className="flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-success/30 bg-success/10 py-2 text-xs font-medium text-success">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> You&apos;ve applied to this offer
          </p>
        ) : (
          <Link href={`/creator/discover/${offer.id}`} className={cn(buttonVariants({ variant: "primary" }), "w-full")}>
            Apply
          </Link>
        )}
      </div>
    </Card>
  );
}
