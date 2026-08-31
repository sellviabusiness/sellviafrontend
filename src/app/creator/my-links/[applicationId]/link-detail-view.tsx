"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { TrackingLinkBox } from "@/components/merchant/tracking-link-box";
import { EventTimeline } from "@/components/creator/event-timeline";
import { findApplicationById, getEventsForApplication, getLinkStats, recordOfferClick, recordCartAdd } from "@/lib/merchant/store";
import { formatCurrency } from "@/lib/merchant/format";
import type { OwnedApplication } from "@/lib/merchant/store";
import type { OfferEvent } from "@/lib/merchant/types";

/** E6 — click → cart-add → purchase timeline for one link, plus commission earned from it. Two
 *  dev-only simulate buttons (same spirit as the merchant Offer Detail's own "Simulate a click")
 *  make the timeline's earlier stages reachable/testable without a real tracking pixel. */
export function LinkDetailView({ applicationId }: { applicationId: string }) {
  const [owned, setOwned] = useState<OwnedApplication | null | undefined>(undefined);
  const [events, setEvents] = useState<OfferEvent[]>([]);
  const [stats, setStats] = useState({ clicks: 0, cartAdds: 0, sales: 0, commissionEarned: 0 });

  async function refresh() {
    const [found, eventsRes, statsRes] = await Promise.all([
      findApplicationById(applicationId),
      getEventsForApplication(applicationId),
      getLinkStats(applicationId),
    ]);
    setOwned(found ?? null);
    setEvents(eventsRes);
    setStats(statsRes);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  if (owned === undefined) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }
  if (owned === null) {
    return <p className="text-sm text-muted-foreground">Link not found.</p>;
  }
  const { merchantEmail, offer, application } = owned;
  const affiliateLink = application.affiliateLink;
  if (!affiliateLink) {
    return <p className="text-sm text-muted-foreground">This application isn&apos;t approved yet — no link exists.</p>;
  }
  const refCode = affiliateLink.refCode;

  async function simulateClick() {
    await recordOfferClick(merchantEmail, offer.id, application.creatorId, refCode);
    refresh();
  }
  async function simulateCartAdd() {
    await recordCartAdd(merchantEmail, offer.id, application.creatorId, refCode);
    refresh();
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/creator/my-links" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> My Links
      </Link>

      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">{offer.productName}</h1>
        <p className="text-sm text-muted-foreground">{formatCurrency(stats.commissionEarned)} earned from this link</p>
      </div>

      <TrackingLinkBox url={affiliateLink.url} />

      <Card className="grid grid-cols-3 divide-x divide-border p-0 text-center">
        <div className="p-4"><p className="text-lg font-semibold text-foreground">{stats.clicks}</p><p className="text-xs text-muted-foreground-2">Clicks</p></div>
        <div className="p-4"><p className="text-lg font-semibold text-foreground">{stats.cartAdds}</p><p className="text-xs text-muted-foreground-2">Cart adds</p></div>
        <div className="p-4"><p className="text-lg font-semibold text-foreground">{stats.sales}</p><p className="text-xs text-muted-foreground-2">Purchases</p></div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-medium text-foreground">Timeline</h2>
        <EventTimeline events={events} />
        <div className="mt-4 flex gap-2 border-t border-border pt-4">
          <Button variant="secondary" onClick={simulateClick}>Simulate a click</Button>
          <Button variant="secondary" onClick={simulateCartAdd}>Simulate cart-add</Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground-2">Dev-only — no real tracking pixel exists yet.</p>
      </Card>
    </div>
  );
}
