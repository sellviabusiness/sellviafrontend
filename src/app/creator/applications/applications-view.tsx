"use client";

import { Fragment, useEffect, useState } from "react";
import { ClipboardList, ChevronDown } from "lucide-react";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { StatusBadge, type StatusTone } from "@/components/reference/ui/status-badge";
import { TrackingLinkBox } from "@/components/merchant/tracking-link-box";
import { getApplicationsForCreator } from "@/lib/merchant/store";
import { deriveCreatorId } from "@/lib/creator/identity";
import { cn } from "@/lib/utils";
import type { OwnedApplication } from "@/lib/merchant/store";
import type { ApplicationStatus } from "@/lib/merchant/types";

const STATUS_TONE: Record<ApplicationStatus, StatusTone> = { pending: "warning", approved: "success", rejected: "danger" };

/**
 * E4 + former E5 (My Links, removed 2026-09-06 product decision) — one table now instead of two
 * pages. An approved row expands in place to show the tracking link, rather than linking out to
 * a separate page: nothing else lived on that old page beyond the same link + a click/sale
 * timeline this app never had real tracking data for anyway (recordOfferClick's own doc comment).
 * Pending/rejected rows aren't expandable — nothing to reveal, the Note column already covers a
 * rejection reason.
 */
export function ApplicationsView({ email }: { email: string }) {
  const [ready, setReady] = useState(false);
  const [applications, setApplications] = useState<OwnedApplication[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const result = await getApplicationsForCreator(deriveCreatorId(email));

      setApplications(result);
      setReady(true);
    })();
  }, [email]);

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Applications</h1>
        <p className="text-sm text-muted-foreground">Every offer you&apos;ve applied to — approved ones reveal your tracking link.</p>
      </div>

      {applications.length === 0 ? (
        <EmptyState icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />} title="No applications yet" description="Browse Discover and apply to an offer to get started." />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-foreground/5 text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-medium">Offer</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 font-medium">Date</th>
                <th scope="col" className="px-4 py-3 font-medium">Note</th>
                <th scope="col" className="px-4 py-3 font-medium"><span className="sr-only">Expand</span></th>
              </tr>
            </thead>
            <tbody>
              {applications.map(({ offer, application }) => {
                const expandable = application.status === "approved" && Boolean(application.affiliateLink);
                const expanded = expandedId === application.id;
                return (
                  <Fragment key={application.id}>
                    <tr
                      onClick={expandable ? () => setExpandedId(expanded ? null : application.id) : undefined}
                      className={cn("border-b border-border last:border-0", expandable && "cursor-pointer hover:bg-foreground/[0.03]")}
                    >
                      <td className="px-4 py-3 font-medium text-foreground">{offer.productName}</td>
                      <td className="px-4 py-3"><StatusBadge tone={STATUS_TONE[application.status]}>{application.status}</StatusBadge></td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(application.appliedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {application.status === "rejected" ? (application.rejectionReason || "Not specified") : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {expandable && (
                          <ChevronDown className={cn("ml-auto h-4 w-4 text-muted-foreground-2 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
                        )}
                      </td>
                    </tr>
                    {expandable && expanded && (
                      <tr className="border-b border-border bg-foreground/[0.02] last:border-0">
                        <td colSpan={5} className="space-y-2 px-4 py-4">
                          <TrackingLinkBox url={application.affiliateLink!.url} label="Your tracking link" />
                          <p className="text-xs text-muted-foreground-2">
                            Fallback discount code: <code>{application.affiliateLink!.discountCode}</code>
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
      )}
    </div>
  );
}
