"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, ChevronDown } from "lucide-react";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { StatusBadge, type StatusTone } from "@/components/reference/ui/status-badge";
import { TrackingLinkBox } from "@/components/merchant/tracking-link-box";
import { Alert } from "@/components/reference/ui/alert";
import { buttonVariants } from "@/components/reference/ui/button";
import { listMyApplications, listAffiliateLinks, affiliateLinkUrl } from "@/lib/creator/real-store";
import { getOffer } from "@/lib/merchant/real-store";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { RealApplication, RealAffiliateLink, RealOffer, RealApplicationStatus } from "@/lib/merchant/types";

const STATUS_TONE: Record<RealApplicationStatus, StatusTone> = { pending: "warning", approved: "success", rejected: "danger" };

/**
 * Real-mode counterpart to applications-view.tsx — same "one table, approved rows expand to
 * show the link" design (My Links removed, 2026-09-06). Two real calls merged client-side:
 * listMyApplications (provisional — see its own doc comment, lib/creator/real-store.ts) for
 * status/dates, listAffiliateLinks for the actual shareable URL once approved, matched by
 * applicationId. Offer names resolved per distinct offerId (GET /offers/{id} is public scope).
 */
export function RealApplicationsView() {
  const [ready, setReady] = useState(false);
  const [applications, setApplications] = useState<RealApplication[]>([]);
  const [links, setLinks] = useState<RealAffiliateLink[]>([]);
  const [offers, setOffers] = useState<Record<string, RealOffer>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [applicationsRes, linksRes] = await Promise.all([listMyApplications(), listAffiliateLinks()]);
        setApplications(applicationsRes);
        setLinks(linksRes);
        const offerIds = Array.from(new Set(applicationsRes.map((a) => a.offerId)));
        const offerEntries = await Promise.all(
          offerIds.map(async (id) => [id, await getOffer(id).catch(() => null)] as const),
        );
        setOffers(Object.fromEntries(offerEntries.filter((e): e is [string, RealOffer] => e[1] !== null)));
      } catch (err) {
        setLoadError(err instanceof ApiError ? err.uiMessage : "Couldn't load your applications.");
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const linkByApplicationId = useMemo(() => Object.fromEntries(links.map((l) => [l.applicationId, l])), [links]);

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Applications</h1>
        <p className="text-sm text-muted-foreground">Every offer you&apos;ve applied to — approved ones reveal your tracking link.</p>
      </div>

      {loadError && <Alert variant="error">{loadError}</Alert>}

      {!loadError && applications.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
          title="No applications yet"
          description="Browse Discover and apply to an offer to get started."
          action={<Link href="/creator/discover" className={buttonVariants({ variant: "primary" })}>Browse offers</Link>}
        />
      ) : (
        applications.length > 0 && (
          <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-foreground/5 text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-4 py-3 font-medium">Offer</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">Date</th>
                  <th scope="col" className="px-4 py-3 font-medium"><span className="sr-only">Expand</span></th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => {
                  const link = linkByApplicationId[application.id];
                  const expandable = application.status === "approved" && Boolean(link);
                  const expanded = expandedId === application.id;
                  return (
                    <Fragment key={application.id}>
                      <tr
                        onClick={expandable ? () => setExpandedId(expanded ? null : application.id) : undefined}
                        className={cn("border-b border-border last:border-0", expandable && "cursor-pointer hover:bg-foreground/[0.03]")}
                      >
                        <td className="px-4 py-3 font-medium text-foreground">{offers[application.offerId]?.name ?? "—"}</td>
                        <td className="px-4 py-3"><StatusBadge tone={STATUS_TONE[application.status]}>{application.status}</StatusBadge></td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(application.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          {expandable && (
                            <ChevronDown className={cn("ml-auto h-4 w-4 text-muted-foreground-2 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
                          )}
                        </td>
                      </tr>
                      {expandable && expanded && link && (
                        <tr className="border-b border-border bg-foreground/[0.02] last:border-0">
                          <td colSpan={4} className="space-y-2 px-4 py-4">
                            <TrackingLinkBox url={affiliateLinkUrl(link.slug)} label="Your tracking link" />
                            <p className="text-xs text-muted-foreground-2">
                              Fallback discount code: <code>{link.discountCode}</code> · locked commission {link.lockedCommissionRate}%
                            </p>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
