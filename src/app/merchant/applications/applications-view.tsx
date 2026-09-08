"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { Select } from "@/components/reference/ui/select";
import { StatusBadge, type StatusTone } from "@/components/reference/ui/status-badge";
import { getApplications, getOffers } from "@/lib/merchant/store";
import { getMockCreator, localFitSummarySnippet } from "@/lib/merchant/mock-creators";
import { formatRelativeTime } from "@/lib/merchant/format";
import type { Application, ApplicationStatus, Offer } from "@/lib/merchant/types";

const STATUS_TONE: Record<ApplicationStatus, StatusTone> = { pending: "warning", approved: "success", rejected: "danger" };

/** D5 — read-only list: creator, niche, audience size, engagement rate, AI fit-summary snippet
 *  (local/fast — see mock-creators.ts's localFitSummarySnippet), status. Filterable by status and
 *  offer via ?status=/?offerId= (Overview's pending-count chip and Offer detail's "View
 *  applications" link both deep-link here). Approve/Reject live on D6's per-application screen. */
export function ApplicationsView({ email }: { email: string }) {
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">(
    (searchParams.get("status") as ApplicationStatus | null) ?? "all",
  );
  const [offerFilter, setOfferFilter] = useState<string>(searchParams.get("offerId") ?? "all");

  useEffect(() => {
    (async () => {
      const [applicationsRes, offersRes] = await Promise.all([getApplications(email), getOffers(email)]);
       
      setApplications(applicationsRes);
      setOffers(offersRes);
      setReady(true);
    })();
  }, [email]);

  const offerById = useMemo(() => Object.fromEntries(offers.map((o) => [o.id, o])), [offers]);

  const filtered = applications.filter(
    (a) => (statusFilter === "all" || a.status === statusFilter) && (offerFilter === "all" || a.offerId === offerFilter),
  );

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Applications</h1>
        <p className="text-sm text-muted-foreground">Creators who applied to one of your offers.</p>
      </div>

      {applications.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
          title="No applications yet"
          description="Once creators apply to your offers, they'll show up here."
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="w-full max-w-[180px]">
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | "all")}>
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </Select>
            </div>
            <div className="w-full max-w-[220px]">
              <Select value={offerFilter} onChange={(e) => setOfferFilter(e.target.value)}>
                <option value="all">All offers</option>
                {offers.map((o) => (
                  <option key={o.id} value={o.id}>{o.productName}</option>
                ))}
              </Select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No applications match this filter.</p>
          ) : (
            <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
              <table className="w-full min-w-[840px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-foreground/5 text-left text-xs text-muted-foreground">
                    <th scope="col" className="px-4 py-3 font-medium">Creator</th>
                    <th scope="col" className="px-4 py-3 font-medium">Offer</th>
                    <th scope="col" className="px-4 py-3 font-medium">Niche</th>
                    <th scope="col" className="px-4 py-3 font-medium">Audience</th>
                    <th scope="col" className="px-4 py-3 font-medium">Engagement</th>
                    <th scope="col" className="px-4 py-3 font-medium">Fit</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => {
                    const creator = getMockCreator(a.creatorId);
                    const offer = offerById[a.offerId];
                    return (
                      <tr key={a.id} className="border-b border-border last:border-0 hover:bg-foreground/[0.03]">
                        <td className="px-4 py-3">
                          <Link href={`/merchant/applications/${a.id}`} className="font-medium text-foreground hover:underline">
                            {creator?.name ?? "Unknown creator"}
                          </Link>
                          <p className="text-xs text-muted-foreground-2">{formatRelativeTime(a.appliedAt)}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{offer?.productName ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{creator?.niche ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{creator ? creator.audienceSize.toLocaleString() : "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{creator ? `${creator.engagementRate.toFixed(1)}%` : "—"}</td>
                        <td className="max-w-[220px] px-4 py-3 text-xs text-muted-foreground-2">
                          {creator && offer ? localFitSummarySnippet(creator, offer) : "—"}
                        </td>
                        <td className="px-4 py-3"><StatusBadge tone={STATUS_TONE[a.status]}>{a.status}</StatusBadge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
