"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Compass, ClipboardList, MousePointerClick, ShoppingBag, Wallet, CheckCircle2, XCircle, Clock } from "lucide-react";
import { StatCard } from "@/components/reference/ui/stat-card";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { buttonVariants } from "@/components/reference/ui/button";
import { Card } from "@/components/reference/ui/card";
import {
  getCreatorClickCount,
  getSalesForCreator,
  getApplicationsForCreator,
  getCreatorEarningsSummary,
  getRecentActivityForCreator,
} from "@/lib/merchant/store";
import { formatCurrency, formatRelativeTime } from "@/lib/merchant/format";
import { deriveCreatorId } from "@/lib/creator/identity";
import { PAYOUT_THRESHOLD_PKR } from "@/lib/creator/constants";
import { getOnboardingRecord } from "@/lib/onboarding/store";
import { getTimeGreeting, firstName } from "@/lib/reference/greeting";
import type { ActivityItem } from "@/lib/merchant/store";

const ACTIVITY_ICON = {
  offer: Compass,
  application: ClipboardList,
  application_approved: CheckCircle2,
  sale: ShoppingBag,
  payout: Wallet,
  click: MousePointerClick,
} as const;

/** E1 — clicks, sales, earnings trend toward the payout threshold, recent activity,
 *  application-status summary. Same read-live-from-shared-store pattern as Merchant Overview
 *  (Playbook 04), scoped to this creator via lib/creator/identity.ts's deriveCreatorId. */
export function OverviewView({ email }: { email: string }) {
  const [ready, setReady] = useState(false);
  const [clicks, setClicks] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [earnings, setEarnings] = useState({ billedAndCharged: 0, totalEarned: 0, saleCount: 0 });
  const [statusCounts, setStatusCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [greetingName, setGreetingName] = useState("");

  useEffect(() => {
    const creatorId = deriveCreatorId(email);
    (async () => {
      const [sales, applications, clicksRes, earningsRes, activityRes] = await Promise.all([
        getSalesForCreator(creatorId),
        getApplicationsForCreator(creatorId),
        getCreatorClickCount(creatorId),
        getCreatorEarningsSummary(creatorId),
        getRecentActivityForCreator(creatorId),
      ]);
       
      setClicks(clicksRes);
      setTotalSales(sales.reduce((sum, o) => sum + o.sale.amount, 0));
      setEarnings(earningsRes);
      setStatusCounts({
        pending: applications.filter((o) => o.application.status === "pending").length,
        approved: applications.filter((o) => o.application.status === "approved").length,
        rejected: applications.filter((o) => o.application.status === "rejected").length,
      });
      setActivity(activityRes);
      setGreetingName(firstName(getOnboardingRecord(email)?.commonProfile?.fullName, email.split("@")[0]));
      setReady(true);
    })();
  }, [email]);

  if (!ready) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" />
        ))}
      </div>
    );
  }

  const thresholdProgress = Math.min(100, (earnings.billedAndCharged / PAYOUT_THRESHOLD_PKR) * 100);
  const hasActivity = statusCounts.pending + statusCounts.approved + statusCounts.rejected > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">
          {getTimeGreeting()}, {greetingName} 👋
        </h1>
        <p className="text-sm text-muted-foreground">Here&apos;s how your links are doing.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Clicks" value={clicks} icon={<MousePointerClick className="h-4 w-4" aria-hidden="true" />} />
        <StatCard label="Sales" value={formatCurrency(totalSales)} icon={<ShoppingBag className="h-4 w-4" aria-hidden="true" />} />
        <StatCard label="Earnings (billed)" value={formatCurrency(earnings.billedAndCharged)} icon={<Wallet className="h-4 w-4" aria-hidden="true" />} />
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Payout progress</p>
          <p className="mt-2 font-[family-name:var(--font-heading)] text-lg font-semibold text-foreground">
            {formatCurrency(earnings.billedAndCharged)} / {formatCurrency(PAYOUT_THRESHOLD_PKR)}
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${thresholdProgress}%` }} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-medium text-foreground">Application status</h2>
          {!hasActivity ? (
            <p className="text-sm text-muted-foreground">No applications yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="flex flex-col items-center gap-1 rounded-[var(--radius-sm)] border border-border p-3">
                <Clock className="h-4 w-4 text-muted-foreground-2" aria-hidden="true" />
                <span className="text-lg font-semibold text-foreground">{statusCounts.pending}</span>
                <span className="text-xs text-muted-foreground-2">Pending</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-[var(--radius-sm)] border border-border p-3">
                <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                <span className="text-lg font-semibold text-foreground">{statusCounts.approved}</span>
                <span className="text-xs text-muted-foreground-2">Approved</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-[var(--radius-sm)] border border-border p-3">
                <XCircle className="h-4 w-4 text-danger" aria-hidden="true" />
                <span className="text-lg font-semibold text-foreground">{statusCounts.rejected}</span>
                <span className="text-xs text-muted-foreground-2">Rejected</span>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-medium text-foreground">Recent activity</h2>
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

      {!hasActivity && (
        <EmptyState
          icon={<Compass className="h-5 w-5" aria-hidden="true" />}
          title="Find your first offer"
          description="Browse live offers and apply to start earning commission."
          action={
            <Link href="/creator/discover" className={buttonVariants({ variant: "primary" })}>
              Browse offers
            </Link>
          }
        />
      )}
    </div>
  );
}
