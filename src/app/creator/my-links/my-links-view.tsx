"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Link2, PartyPopper, MousePointerClick, ShoppingBag } from "lucide-react";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { buttonVariants } from "@/components/reference/ui/button";
import { Card } from "@/components/reference/ui/card";
import { TrackingLinkBox } from "@/components/merchant/tracking-link-box";
import { DisclosureNudge } from "@/components/ai/disclosure-nudge";
import { getApplicationsForCreator, getLinkStats } from "@/lib/merchant/store";
import { deriveCreatorId } from "@/lib/creator/identity";
import { formatCurrency } from "@/lib/merchant/format";
import type { OwnedApplication } from "@/lib/merchant/store";

/**
 * E5 — offer, slug/URL, discount code, click/sale summary, copy actions. The most recently
 * approved link gets the "Get Link" payoff treatment (celebratory framing + DisclosureNudge,
 * carrying over the disclosure-nudge placement from the old stub) rather than sitting as a plain
 * table row like the rest — per the explicit "should feel like a payoff" requirement.
 */
type LinkStats = Awaited<ReturnType<typeof getLinkStats>>;

export function MyLinksView({ email }: { email: string }) {
  const [ready, setReady] = useState(false);
  const [approved, setApproved] = useState<OwnedApplication[]>([]);
  const [linkStats, setLinkStats] = useState<Record<string, LinkStats>>({});

  useEffect(() => {
    (async () => {
      const all = await getApplicationsForCreator(deriveCreatorId(email));
      const apps = all.filter((o) => o.application.status === "approved");
      // getLinkStats is a real network round-trip now (Playbook 09) — this render's per-row
      // stats used to be called live during .map() below, which can't await; computed here
      // instead, once, keyed by applicationId.
      const statsEntries = await Promise.all(apps.map(async (o) => [o.application.id, await getLinkStats(o.application.id)] as const));
       
      setApproved(apps);
      setLinkStats(Object.fromEntries(statsEntries));
      setReady(true);
    })();
  }, [email]);

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }

  const [newest, ...rest] = approved;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">My Links</h1>
        <p className="text-sm text-muted-foreground">Your tracking links for every offer you&apos;re approved on.</p>
      </div>

      {approved.length === 0 ? (
        <EmptyState
          icon={<Link2 className="h-5 w-5" aria-hidden="true" />}
          title="Get your first link"
          description="Once a merchant approves your application, your link shows up here."
          action={
            <Link href="/creator/discover" className={buttonVariants({ variant: "primary" })}>
              Browse offers
            </Link>
          }
        />
      ) : (
        <>
          <Card className="space-y-4 border-accent/40 bg-accent/5 p-6">
            <div className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-accent" aria-hidden="true" />
              <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-foreground">
                Your link for &ldquo;{newest.offer.productName}&rdquo; is ready
              </h2>
            </div>
            {newest.application.affiliateLink && (
              <>
                <TrackingLinkBox url={newest.application.affiliateLink.url} label="Your tracking link" />
                <p className="text-xs text-muted-foreground-2">
                  Fallback discount code: <code>{newest.application.affiliateLink.discountCode}</code>
                </p>
              </>
            )}
            <DisclosureNudge />
            <Link href={`/creator/my-links/${newest.application.id}`} className="text-sm text-accent underline underline-offset-2">
              View click/sale timeline
            </Link>
          </Card>

          {rest.length > 0 && (
            <div className="space-y-3">
              {rest.map(({ offer, application }) => {
                const stats = linkStats[application.id] ?? { clicks: 0, cartAdds: 0, sales: 0, commissionEarned: 0 };
                return (
                  <Card key={application.id} className="space-y-3 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-medium text-foreground">{offer.productName}</h3>
                      <Link href={`/creator/my-links/${application.id}`} className="text-xs text-accent underline underline-offset-2">
                        View timeline
                      </Link>
                    </div>
                    {application.affiliateLink && <TrackingLinkBox url={application.affiliateLink.url} label="" />}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground-2">
                      <span className="flex items-center gap-1"><MousePointerClick className="h-3.5 w-3.5" aria-hidden="true" /> {stats.clicks} clicks</span>
                      <span className="flex items-center gap-1"><ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" /> {stats.sales} sales</span>
                      <span>{formatCurrency(stats.commissionEarned)} earned</span>
                      {application.affiliateLink && <span>Code: <code>{application.affiliateLink.discountCode}</code></span>}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
