"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, ClipboardList, UserCheck, ShoppingBag, TrendingUp, TrendingDown, Plus, MousePointerClick } from "lucide-react";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { buttonVariants } from "@/components/reference/ui/button";
import { Card } from "@/components/reference/ui/card";
import { Select } from "@/components/reference/ui/select";
import { OnboardingGateBanner } from "@/components/merchant/onboarding-gate-banner";
import { SalesLineChart } from "@/components/merchant/sales-line-chart";
import { getOverviewStats, getOverviewTrends, getOffers, getRecentActivity, getDailySalesSeries } from "@/lib/merchant/store";
import { formatCurrency, formatRelativeTime } from "@/lib/merchant/format";
import { getOnboardingRecord } from "@/lib/onboarding/store";
import { getTimeGreeting, firstName } from "@/lib/reference/greeting";
import type { ActivityItem, OverviewTrends } from "@/lib/merchant/store";
import type { OverviewStats, Offer } from "@/lib/merchant/types";

const ACTIVITY_ICON = {
  offer: Megaphone,
  application: ClipboardList,
  application_approved: UserCheck,
  sale: ShoppingBag,
  // "click" is never produced by this file's own getRecentActivity — only the Creator-side
  // getRecentActivityForCreator (Playbook 05) does — but ActivityItem's kind union is shared, so
  // this map needs every case covered regardless of which producer is in play.
  click: MousePointerClick,
} as const;

/** D1, refreshed — stat cards with a real (or honestly-placeholder) trend line, a Sales Overview
 *  chart, and a Recent Activity feed alongside it. Reads live from the shared mock store, same
 *  pattern as before. */
export function OverviewView({ email, onboardingComplete }: { email: string; onboardingComplete: boolean }) {
  const [ready, setReady] = useState(false);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [trends, setTrends] = useState<OverviewTrends | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [seriesDays, setSeriesDays] = useState<7 | 30>(7);
  const [series, setSeries] = useState<{ label: string; value: number }[]>([]);
  const [greetingName, setGreetingName] = useState("");

  useEffect(() => {
    let cancelled = false;
    // Merchant/store.ts's persistence is now server-backed (Playbook 09 — genuinely shared
    // across browser profiles, not localStorage), so these reads are real network round-trips.
    (async () => {
      const [statsRes, trendsRes, offersRes, activityRes] = await Promise.all([
        getOverviewStats(email),
        getOverviewTrends(email),
        getOffers(email),
        getRecentActivity(email),
      ]);
      if (cancelled) return;
       
      setStats(statsRes);
      setTrends(trendsRes);
      setOffers(offersRes);
      setActivity(activityRes);
      setGreetingName(firstName(getOnboardingRecord(email)?.commonProfile?.fullName, email.split("@")[0]));
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [email]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      const result = await getDailySalesSeries(email, seriesDays);
      if (cancelled) return;
       
      setSeries(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [email, seriesDays, ready]);

  if (!ready || !stats || !trends) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" />
        ))}
      </div>
    );
  }

  const hasOffers = offers.length > 0;

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
          New Campaign
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <TrendStatCard label="Total Sales" value={formatCurrency(stats.totalSales)} trend={trends.totalSales} />
        <TrendStatCard label="Active Campaigns" value={stats.activeOffers} trend={trends.activeOffers} />
        <TrendStatCard label="Applications" value={stats.totalApplications} trend={trends.applications} />
        <TrendStatCard label="Total Payouts" value={formatCurrency(stats.totalSpend)} trend={trends.totalPayouts} />
      </div>

      {!hasOffers ? (
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
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium text-foreground">Sales Overview</h2>
              <div className="w-36">
                <Select value={String(seriesDays)} onChange={(e) => setSeriesDays(Number(e.target.value) as 7 | 30)}>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                </Select>
              </div>
            </div>
            <SalesLineChart data={series} />
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-medium text-foreground">Recent Activity</h2>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing yet.</p>
            ) : (
              <ul className="space-y-3">
                {activity.map((item) => {
                  const Icon = ACTIVITY_ICON[item.kind];
                  return (
                    <li key={item.id} className="flex items-center gap-3 text-sm">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <span className="flex-1 text-foreground">{item.message}</span>
                      <span className="shrink-0 text-xs text-muted-foreground-2">{formatRelativeTime(item.at)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

/**
 * Trend line: real month-over-month % change when the store can compute one, otherwise an
 * explicit "Not enough data yet" placeholder — never a fabricated percentage. `trend === null`
 * covers both "no prior-month data to compare against" (store.ts's percentChange) and
 * "Active Campaigns" always (no historical status snapshot exists to compare against at all, see
 * OverviewTrends.activeOffers's doc comment). Same Card shell as StatCard, just with this
 * null-aware trend line instead of StatCard's own delta prop (which has no "no data" state).
 */
function TrendStatCard({ label, value, trend }: { label: string; value: string | number; trend: number | null }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-foreground">{value}</p>
      {trend === null ? (
        <p className="mt-1 text-xs text-muted-foreground-2">Not enough data yet</p>
      ) : (
        <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${trend >= 0 ? "text-success" : "text-danger"}`}>
          {trend >= 0 ? <TrendingUp className="h-3 w-3" aria-hidden="true" /> : <TrendingDown className="h-3 w-3" aria-hidden="true" />}
          {trend >= 0 ? "+" : ""}
          {trend}% from last month
        </p>
      )}
    </Card>
  );
}
