"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Compass, ClipboardList, MousePointerClick, ShoppingBag, Wallet, CheckCircle2, XCircle, Clock } from "lucide-react";
import { StatCard } from "@/components/reference/ui/stat-card";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { buttonVariants } from "@/components/reference/ui/button";
import { Card } from "@/components/reference/ui/card";
import { Alert } from "@/components/reference/ui/alert";
import { TimeseriesChart } from "@/components/reference/ui/timeseries-chart";
import { RingChart, RingLegend } from "@/components/reference/ui/ring-chart";
import { SkeletonStatGrid } from "@/components/reference/ui/skeleton";
import { getCreatorDashboard, listMyApplications, getCreatorDashboardTimeseries, getCreatorEarningsBreakdown } from "@/lib/creator/real-store";
import { formatCurrency } from "@/lib/merchant/format";
import { getOnboardingRecord } from "@/lib/onboarding/store";
import { getTimeGreeting, firstName } from "@/lib/reference/greeting";
import { ApiError } from "@/lib/api";
import type { RealCreatorDashboard, RealCreatorTimeseriesPoint, RealCreatorEarningsBreakdown } from "@/lib/merchant/types";

/**
 * Real-mode counterpart to overview-view.tsx. `?compareTo=previous_period` and the `/timeseries`
 * and `/earnings-breakdown` endpoints all shipped 2026-09 (commit 1ad2951) — no payout-threshold
 * progress bar still (the real model has none: monthly cadence, full balance, no minimum), and
 * no generic activity feed, but the trend chart and the earnings-by-status ring are both real
 * now. Application status counts were already real — computed client-side from
 * listMyApplications(), unchanged here.
 */
export function RealOverviewView({ email }: { email: string }) {
  const [ready, setReady] = useState(false);
  const [dashboard, setDashboard] = useState<RealCreatorDashboard | null>(null);
  const [timeseries, setTimeseries] = useState<RealCreatorTimeseriesPoint[]>([]);
  const [earnings, setEarnings] = useState<RealCreatorEarningsBreakdown | null>(null);
  const [statusCounts, setStatusCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [greetingName, setGreetingName] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [dashboardRes, timeseriesRes, earningsRes] = await Promise.all([
          getCreatorDashboard(true),
          getCreatorDashboardTimeseries("day", "30d"),
          getCreatorEarningsBreakdown(),
        ]);
        setDashboard(dashboardRes);
        setTimeseries(timeseriesRes);
        setEarnings(earningsRes);
      } catch (err) {
        setLoadError(err instanceof ApiError ? err.uiMessage : "Couldn't load your dashboard.");
      }
      try {
        const applications = await listMyApplications();
        setStatusCounts({
          pending: applications.filter((a) => a.status === "pending").length,
          approved: applications.filter((a) => a.status === "approved").length,
          rejected: applications.filter((a) => a.status === "rejected").length,
        });
      } catch {
        // Non-fatal — the rest of the dashboard still renders without this breakdown.
      }
      setGreetingName(firstName(getOnboardingRecord(email)?.commonProfile?.fullName, email.split("@")[0]));
      setReady(true);
    })();
  }, [email]);

  if (!ready) {
    return <SkeletonStatGrid count={4} className="lg:grid-cols-4" />;
  }

  const hasApplications = statusCounts.pending + statusCounts.approved + statusCounts.rejected > 0;
  const earningsSegments = earnings
    ? [
        { label: "Pending", value: earnings.pendingCents, color: "var(--pastel-yellow-foreground)" },
        { label: "Billed", value: earnings.billedCents, color: "var(--pastel-blue-foreground)" },
        { label: "Paid", value: earnings.paidCents, color: "var(--pastel-green-foreground)" },
      ]
    : [];
  const earningsTotalCents = earnings ? earnings.pendingCents + earnings.billedCents + earnings.paidCents : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">
          {getTimeGreeting()}, {greetingName} 👋
        </h1>
        <p className="text-sm text-muted-foreground">Here&apos;s how your links are doing.</p>
      </div>

      {loadError && <Alert variant="error">{loadError}</Alert>}

      {dashboard && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard tone="yellow" label="Links" value={dashboard.linksTotal} icon={<ClipboardList className="h-4 w-4" aria-hidden="true" />} />
          <StatCard tone="green" label="Clicks" value={dashboard.clicksTotal} delta={dashboard.clicksDeltaPercent ?? undefined} icon={<MousePointerClick className="h-4 w-4" aria-hidden="true" />} />
          <StatCard tone="lavender" label="Sales attributed" value={dashboard.salesAttributedTotal} delta={dashboard.salesDeltaPercent ?? undefined} icon={<ShoppingBag className="h-4 w-4" aria-hidden="true" />} />
          <Card className="bg-[var(--pastel-blue)] p-5 text-[var(--pastel-blue-foreground)]">
            <p className="text-sm text-inherit opacity-70">Wallet balance</p>
            <p className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-inherit">{formatCurrency(dashboard.walletBalanceCents / 100)}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-inherit opacity-70">
              <Wallet className="h-3 w-3" aria-hidden="true" />
              {dashboard.hasPayoutThisPeriod ? "Paid out this month" : "Not paid out yet this month"}
            </p>
          </Card>
        </div>
      )}

      {dashboard && dashboard.linksTotal > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <h2 className="mb-3 text-sm font-medium text-foreground">Last 30 days</h2>
            <TimeseriesChart
              data={timeseries}
              series={[
                { key: "earningsCents", label: "Earnings", color: "var(--pastel-green-foreground)", format: (v) => formatCurrency(v / 100) },
                { key: "clicksTotal", label: "Clicks", color: "var(--pastel-blue-foreground)" },
                { key: "salesTotal", label: "Sales", color: "var(--pastel-pink-foreground)" },
              ]}
            />
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-medium text-foreground">Earnings pipeline</h2>
            {earnings && earningsTotalCents > 0 ? (
              <div className="flex items-center gap-4">
                <RingChart segments={earningsSegments} centerValue={formatCurrency(earningsTotalCents / 100)} centerLabel="total" />
                <RingLegend segments={earningsSegments} format={(cents) => formatCurrency(cents / 100)} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing in the pipeline yet.</p>
            )}
          </Card>
        </div>
      )}

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-medium text-foreground">Application status</h2>
        {!hasApplications ? (
          <p className="text-sm text-muted-foreground">No applications yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-2 rounded-[var(--radius-md)] border-2 border-border bg-[var(--pastel-yellow)] p-4 text-center text-[var(--pastel-yellow-foreground)]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-border bg-card">
                <Clock className="h-4 w-4 text-inherit" aria-hidden="true" />
              </span>
              <span className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-inherit">{statusCounts.pending}</span>
              <span className="text-xs font-medium text-inherit opacity-80">Pending</span>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-[var(--radius-md)] border-2 border-border bg-[var(--pastel-green)] p-4 text-center text-[var(--pastel-green-foreground)]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-border bg-card">
                <CheckCircle2 className="h-4 w-4 text-inherit" aria-hidden="true" />
              </span>
              <span className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-inherit">{statusCounts.approved}</span>
              <span className="text-xs font-medium text-inherit opacity-80">Approved</span>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-[var(--radius-md)] border-2 border-border bg-[var(--pastel-pink)] p-4 text-center text-[var(--pastel-pink-foreground)]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-border bg-card">
                <XCircle className="h-4 w-4 text-inherit" aria-hidden="true" />
              </span>
              <span className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-inherit">{statusCounts.rejected}</span>
              <span className="text-xs font-medium text-inherit opacity-80">Rejected</span>
            </div>
          </div>
        )}
      </Card>

      {!hasApplications && (
        <EmptyState
          icon={<Compass className="h-5 w-5" aria-hidden="true" />}
          title="Find your first offer"
          description="Browse live offers and apply to start earning commission."
          action={<Link href="/creator/discover" className={buttonVariants({ variant: "primary" })}>Browse offers</Link>}
        />
      )}
    </div>
  );
}
