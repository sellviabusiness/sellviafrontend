"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Compass, ClipboardList, MousePointerClick, ShoppingBag, Wallet, CheckCircle2, XCircle, Clock } from "lucide-react";
import { StatCard } from "@/components/reference/ui/stat-card";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { buttonVariants } from "@/components/reference/ui/button";
import { Card } from "@/components/reference/ui/card";
import { Alert } from "@/components/reference/ui/alert";
import { getCreatorDashboard, listMyApplications } from "@/lib/creator/real-store";
import { formatCurrency } from "@/lib/merchant/format";
import { getOnboardingRecord } from "@/lib/onboarding/store";
import { getTimeGreeting, firstName } from "@/lib/reference/greeting";
import { ApiError } from "@/lib/api";
import type { RealCreatorDashboard } from "@/lib/merchant/types";

/**
 * Real-mode counterpart to overview-view.tsx. No payout-threshold progress bar (the real model
 * has none — monthly cadence, full balance, no minimum); `hasPayoutThisPeriod` shown as a plain
 * status line instead. No activity feed (no real endpoint for one). Application status counts
 * ARE real, though, unlike the rest of this screen — computed client-side from
 * listMyApplications() rather than guessed at, since that endpoint already exists.
 */
export function RealOverviewView({ email }: { email: string }) {
  const [ready, setReady] = useState(false);
  const [dashboard, setDashboard] = useState<RealCreatorDashboard | null>(null);
  const [statusCounts, setStatusCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [greetingName, setGreetingName] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setDashboard(await getCreatorDashboard());
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
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" />
        ))}
      </div>
    );
  }

  const hasApplications = statusCounts.pending + statusCounts.approved + statusCounts.rejected > 0;

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
          <StatCard label="Links" value={dashboard.linksTotal} icon={<ClipboardList className="h-4 w-4" aria-hidden="true" />} />
          <StatCard label="Clicks" value={dashboard.clicksTotal} icon={<MousePointerClick className="h-4 w-4" aria-hidden="true" />} />
          <StatCard label="Sales attributed" value={dashboard.salesAttributedTotal} icon={<ShoppingBag className="h-4 w-4" aria-hidden="true" />} />
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">Wallet balance</p>
            <p className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-foreground">{formatCurrency(dashboard.walletBalanceCents / 100)}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground-2">
              <Wallet className="h-3 w-3" aria-hidden="true" />
              {dashboard.hasPayoutThisPeriod ? "Paid out this month" : "Not paid out yet this month"}
            </p>
          </Card>
        </div>
      )}

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-medium text-foreground">Application status</h2>
        {!hasApplications ? (
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
