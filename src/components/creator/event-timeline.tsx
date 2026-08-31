import { MousePointerClick, ShoppingCart, CreditCard } from "lucide-react";
import type { OfferEvent } from "@/lib/merchant/types";
import { formatRelativeTime } from "@/lib/merchant/format";

const STAGE_ICON = { click: MousePointerClick, cart_add: ShoppingCart, purchase: CreditCard } as const;
const STAGE_LABEL = { click: "Click", cart_add: "Added to cart", purchase: "Purchase" } as const;

/** E6 — click → cart-add → purchase timeline for one link. "purchase" events are always real
 *  (generated alongside an actual Sale, see lib/merchant/store.ts's recordMockSale); "click"/
 *  "cart_add" are the mock event log Playbook 05 §21.6 approved adding — same simulator pattern
 *  as the merchant-side click counter, just attributed to one creator's own link this time. */
export function EventTimeline({ events }: { events: OfferEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity on this link yet.</p>;
  }

  return (
    <ol className="space-y-4">
      {events.map((event, i) => {
        const Icon = STAGE_ICON[event.stage];
        return (
          <li key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              {i < events.length - 1 && <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />}
            </div>
            <div className="pb-4">
              <p className="text-sm font-medium text-foreground">{STAGE_LABEL[event.stage]}</p>
              <p className="text-xs text-muted-foreground-2">{formatRelativeTime(event.at)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
