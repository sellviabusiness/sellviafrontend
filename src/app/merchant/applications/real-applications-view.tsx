"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { Select } from "@/components/reference/ui/select";
import { StatusBadge, type StatusTone } from "@/components/reference/ui/status-badge";
import { Alert } from "@/components/reference/ui/alert";
import { listMyApplications, listMyOffers } from "@/lib/merchant/real-store";
import { ApiError } from "@/lib/api";
import type { RealApplication, RealApplicationStatus, RealOffer } from "@/lib/merchant/types";

const STATUS_TONE: Record<RealApplicationStatus, StatusTone> = { pending: "warning", approved: "success", rejected: "danger" };

/**
 * Real-mode counterpart to applications-view.tsx. Creator niche/audience/engagement/platform now
 * come straight off the application itself (RealApplication's own doc comment, types.ts) —
 * snapshotted at submission time, not a live creator-profile lookup. No AI fit-summary column:
 * that's gated off elsewhere in this app (no ai_services module exists yet).
 */
export function RealApplicationsView() {
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [applications, setApplications] = useState<RealApplication[]>([]);
  const [offers, setOffers] = useState<RealOffer[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<RealApplicationStatus | "all">(
    (searchParams.get("status") as RealApplicationStatus | null) ?? "all",
  );
  const [offerFilter, setOfferFilter] = useState<string>(searchParams.get("offerId") ?? "all");

  useEffect(() => {
    (async () => {
      try {
        const [applicationsRes, offersRes] = await Promise.all([listMyApplications(), listMyOffers()]);
        setApplications(applicationsRes);
        setOffers(offersRes);
      } catch (err) {
        setLoadError(err instanceof ApiError ? err.uiMessage : "Couldn't load your applications.");
      } finally {
        setReady(true);
      }
    })();
  }, []);

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

      {loadError && <Alert variant="error">{loadError}</Alert>}

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
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as RealApplicationStatus | "all")}>
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
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </Select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No applications match this filter.</p>
          ) : (
            <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
              <table className="w-full min-w-[780px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-foreground/5 text-left text-xs text-muted-foreground">
                    <th scope="col" className="px-4 py-3 font-medium">Creator</th>
                    <th scope="col" className="px-4 py-3 font-medium">Offer</th>
                    <th scope="col" className="px-4 py-3 font-medium">Niche</th>
                    <th scope="col" className="px-4 py-3 font-medium">Audience</th>
                    <th scope="col" className="px-4 py-3 font-medium">Engagement</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0 hover:bg-foreground/[0.03]">
                      <td className="px-4 py-3">
                        <Link href={`/merchant/applications/${a.id}`} className="font-medium text-foreground hover:underline">
                          {a.creatorName ?? "Unnamed creator"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{offerById[a.offerId]?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.creatorNiche ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.creatorAudienceSize.toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.creatorEngagementRate !== null ? `${a.creatorEngagementRate.toFixed(1)}%` : "—"}</td>
                      <td className="px-4 py-3"><StatusBadge tone={STATUS_TONE[a.status]}>{a.status}</StatusBadge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
