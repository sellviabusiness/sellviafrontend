import Link from "next/link";
import { ImageOff, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { StatusBadge } from "@/components/reference/ui/status-badge";
import { buttonVariants } from "@/components/reference/ui/button";
import { formatCurrency } from "@/lib/merchant/format";
import { cn } from "@/lib/utils";
import type { Offer } from "@/lib/merchant/types";

/**
 * E2's browse card — read-only (no pause/resume/etc., that's merchant-only). "Already applied"
 * is real, computed from this creator's own applications, not a placeholder.
 *
 * Apply button: this session's own explicit instruction — every card must show a visible Apply
 * affordance directly in the grid, not just on the detail page. It navigates to the detail page
 * (`/creator/discover/:id`) rather than applying inline, since that page already owns the real
 * apply mutation (applyToOfferAsCreator) — one call site for that write, not two; the detail page
 * also surfaces the audience/offer terms and the real self-dealing/duplicate-application errors
 * before the write happens, which a one-click inline apply from the grid would skip.
 *
 * Structurally: two sibling `<Link>`s (image+details, and the Apply button), not one nested
 * inside the other — nested `<a>` tags are invalid HTML and browsers un-nest them unpredictably.
 */
export function OfferBrowseCard({ offer, alreadyApplied }: { offer: Offer; alreadyApplied: boolean }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden p-0 transition-colors hover:border-border-hover">
      <Link href={`/creator/discover/${offer.id}`} className="flex flex-1 flex-col gap-3">
        <div className="relative aspect-video w-full bg-foreground/5">
          {offer.imageDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={offer.imageDataUrl} alt={offer.productName} className="h-full w-full object-cover" />
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
          <h3 className="font-[family-name:var(--font-heading)] text-base font-semibold text-foreground">{offer.productName}</h3>
          <p className="text-sm text-muted-foreground">{offer.category}</p>
          <div className="mt-auto flex items-center justify-between text-sm">
            <span className="text-foreground">{formatCurrency(offer.price)}</span>
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
