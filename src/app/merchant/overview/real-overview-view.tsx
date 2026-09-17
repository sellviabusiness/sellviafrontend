"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, Plus, MousePointerClick, ShoppingBag, CreditCard, Percent } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { buttonVariants } from "@/components/reference/ui/button";
import { StatCard } from "@/components/reference/ui/stat-card";
import { Alert } from "@/components/reference/ui/alert";
import { TimeseriesChart } from "@/components/reference/ui/timeseries-chart";
import { SkeletonStatGrid } from "@/components/reference/ui/skeleton";
import { OnboardingGateBanner } from "@/components/merchant/onboarding-gate-banner";
import { getMerchantDashboard, getMerchantDashboardTimeseries } from "@/lib/merchant/real-store";
import { formatCurrency, formatPercent } from "@/lib/merchant/format";
import { getOnboardingRecord } from "@/lib/onboarding/store";
import { getTimeGreeting, firstName } from "@/lib/reference/greeting";
import { ApiError } from "@/lib/api";
import type { RealMerchantDashboard, RealMerchantTimeseriesPoint } from "@/lib/merchant/types";

/**
 * Real-mode counterpart to overview-view.tsx. `GET /analytics/merchant-dashboard` used to be
 * this coarse — no time series, no trend deltas — but both shipped 2026-09 (commit 1ad2951):
 * `?compareTo=previous_period` for the KPI deltas below, and a real `/timeseries` endpoint for
 * the trend chart. Per-offer stats/activity feed/revenue-by-offer are still genuinely
 * unavailable (RealSale has no offerId yet) — not guessed at here.
 */
export function RealOverviewView({ email, onboardingComplete }: { email: string; onboardingComplete: boolean }) {
  const [ready, setReady] = useState(false);
  const [stats, setStats] = useState<RealMerchantDashboard | null>(null);
  const [timeseries, setTimeseries] = useState<RealMerchantTimeseriesPoint[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [greetingName, setGreetingName] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [statsRes, timeseriesRes] = await Promise.all([
          getMerchantDashboard(true),
          getMerchantDashboardTimeseries("day", "30d"),
        ]);
        setStats(statsRes);
        setTimeseries(timeseriesRes);
      } catch (err) {
        setLoadError(err instanceof ApiError ? err.uiMessage : "Couldn't load your dashboard.");
      } finally {
        setGreetingName(firstName(getOnboardingRecord(email)?.commonProfile?.fullName, email.split("@")[0]));
        setReady(true);
      }
    })();
  }, [email]);

  if (!ready) {
    return <SkeletonStatGrid count={5} />;
  }

  const hasOffers = (stats?.offersTotal ?? 0) > 0;

  return (
    <div className="space-y-6">
      {!onboardingComplete && <OnboardingGateBanner />}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">
            {getTimeGreeting()}, {greetingName} 👋
          </h1>
          <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s happening with your store today.</p>
        </div>
        <Link href="/merchant/offers/new" className={buttonVariants({ variant: "primary" })}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New offer
        </Link>
      </div>

      {loadError && <Alert variant="error">{loadError}</Alert>}

      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard tone="yellow" label="Live offers" value={`${stats.offersLive} / ${stats.offersTotal}`} icon={<Megaphone className="h-4 w-4" aria-hidden="true" />} />
          <StatCard tone="green" label="Clicks" value={stats.clicksTotal} delta={stats.clicksDeltaPercent ?? undefined} icon={<MousePointerClick className="h-4 w-4" aria-hidden="true" />} />
          <StatCard tone="lavender" label="Sales accepted" value={stats.salesAcceptedTotal} delta={stats.salesDeltaPercent ?? undefined} icon={<ShoppingBag className="h-4 w-4" aria-hidden="true" />} />
          <StatCard tone="pink" label="Conversion rate" value={formatPercent(stats.conversionRate)} delta={stats.conversionRateDeltaPercent ?? undefined} icon={<Percent className="h-4 w-4" aria-hidden="true" />} />
          <StatCard tone="blue" label="Amount billed" value={formatCurrency(stats.amountBilledCents / 100)} delta={stats.amountBilledDeltaPercent ?? undefined} icon={<CreditCard className="h-4 w-4" aria-hidden="true" />} />
        </div>
      )}

      {hasOffers && stats && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <h2 className="mb-3 text-sm font-medium text-foreground">Last 30 days</h2>
            <TimeseriesChart
              data={timeseries}
              series={[
                { key: "revenueCents", label: "Revenue", color: "var(--pastel-green-foreground)", format: (v) => formatCurrency(v / 100) },
                { key: "clicksTotal", label: "Clicks", color: "var(--pastel-blue-foreground)" },
                { key: "salesTotal", label: "Sales", color: "var(--pastel-pink-foreground)" },
              ]}
            />
          </Card>

          <Card className="flex flex-col p-5">
            <h2 className="mb-4 text-sm font-medium text-foreground">Conversion</h2>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Clicks</span>
              <span className="font-semibold text-foreground">{stats.clicksTotal.toLocaleString()}</span>
            </div>
            <div className="my-2 h-2 w-full overflow-hidden rounded-[var(--radius-sm)] border-2 border-border bg-foreground/5">
              <div
                className="h-full bg-[var(--pastel-green-foreground)] transition-[width]"
                style={{ width: `${Math.min(100, stats.conversionRate)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Sales accepted</span>
              <span className="font-semibold text-foreground">{stats.salesAcceptedTotal.toLocaleString()}</span>
            </div>
            <div className="mt-auto pt-4 text-center">
              <p className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-foreground">{formatPercent(stats.conversionRate)}</p>
              <p className="text-xs text-muted-foreground">of clicks converted to a sale</p>
            </div>
          </Card>
        </div>
      )}

      {!hasOffers && (
        <EmptyState
          icon={<Megaphone className="h-5 w-5" aria-hidden="true" />}
          title="Start your first offer"
          description="List a product with a commission and creators can start applying."
          action={
            <Link href="/merchant/offers/new" className={buttonVariants({ variant: "primary" })}>
              + Create your first offer
            </Link>
          }
        />
      )}
    </div>
  );
}
