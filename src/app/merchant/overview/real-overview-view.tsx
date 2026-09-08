"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, Plus, MousePointerClick, ShoppingBag, CreditCard, Percent } from "lucide-react";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { buttonVariants } from "@/components/reference/ui/button";
import { StatCard } from "@/components/reference/ui/stat-card";
import { Alert } from "@/components/reference/ui/alert";
import { OnboardingGateBanner } from "@/components/merchant/onboarding-gate-banner";
import { getMerchantDashboard } from "@/lib/merchant/real-store";
import { formatCurrency, formatPercent } from "@/lib/merchant/format";
import { getOnboardingRecord } from "@/lib/onboarding/store";
import { getTimeGreeting, firstName } from "@/lib/reference/greeting";
import { ApiError } from "@/lib/api";
import type { RealMerchantDashboard } from "@/lib/merchant/types";

/**
 * Real-mode counterpart to overview-view.tsx. `GET /analytics/merchant-dashboard` is genuinely
 * this coarse — no time series, no per-offer breakdown, no activity feed, no month-over-month
 * trend deltas (see RealMerchantDashboard's own doc comment, types.ts). Shown plainly rather
 * than faking a chart or feed out of nothing.
 */
export function RealOverviewView({ email, onboardingComplete }: { email: string; onboardingComplete: boolean }) {
  const [ready, setReady] = useState(false);
  const [stats, setStats] = useState<RealMerchantDashboard | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [greetingName, setGreetingName] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setStats(await getMerchantDashboard());
      } catch (err) {
        setLoadError(err instanceof ApiError ? err.uiMessage : "Couldn't load your dashboard.");
      } finally {
        setGreetingName(firstName(getOnboardingRecord(email)?.commonProfile?.fullName, email.split("@")[0]));
        setReady(true);
      }
    })();
  }, [email]);

  if (!ready) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" />
        ))}
      </div>
    );
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
          <StatCard label="Live offers" value={`${stats.offersLive} / ${stats.offersTotal}`} icon={<Megaphone className="h-4 w-4" aria-hidden="true" />} />
          <StatCard label="Clicks" value={stats.clicksTotal} icon={<MousePointerClick className="h-4 w-4" aria-hidden="true" />} />
          <StatCard label="Sales accepted" value={stats.salesAcceptedTotal} icon={<ShoppingBag className="h-4 w-4" aria-hidden="true" />} />
          <StatCard label="Conversion rate" value={formatPercent(stats.conversionRate)} icon={<Percent className="h-4 w-4" aria-hidden="true" />} />
          <StatCard label="Amount billed" value={formatCurrency(stats.amountBilledCents / 100)} icon={<CreditCard className="h-4 w-4" aria-hidden="true" />} />
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
