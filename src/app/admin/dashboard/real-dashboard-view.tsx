"use client";

import { useEffect, useState } from "react";
import { Users, UserCheck, Scale3d } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { StatCard } from "@/components/reference/ui/stat-card";
import { Alert } from "@/components/reference/ui/alert";
import { getMarketplaceKpis, getFunnel } from "@/lib/admin/real-store";
import { formatPercent, formatCurrency } from "@/lib/merchant/format";
import { ApiError } from "@/lib/api";
import type { RealMarketplaceKPIs, RealFunnel, RealFunnelStage } from "@/lib/admin/types";

/** Real-mode counterpart to dashboard-view.tsx. One combined funnel call (merchant+creator)
 *  instead of two, richer rate set (refund/flagged-sale/flagged-application on top of liquidity/
 *  conversion), no month-over-month "time to payout, last 6 months" history — timeToPayoutAvgHours
 *  below is a single trailing-window aggregate, not a trend. Several rates are nullable "not
 *  enough data yet", same convention the mock dashboard already used for liquidityRatio. */
export function RealDashboardView() {
  const [ready, setReady] = useState(false);
  const [kpis, setKpis] = useState<RealMarketplaceKPIs | null>(null);
  const [funnel, setFunnel] = useState<RealFunnel | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [kpisRes, funnelRes] = await Promise.all([getMarketplaceKpis(), getFunnel()]);
        setKpis(kpisRes);
        setFunnel(funnelRes);
      } catch (err) {
        setLoadError(err instanceof ApiError ? err.uiMessage : "Couldn't load marketplace KPIs.");
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" />
        ))}
      </div>
    );
  }

  if (loadError || !kpis) {
    return <Alert variant="error">{loadError ?? "Couldn't load marketplace KPIs."}</Alert>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Marketplace health</h1>
        <p className="text-sm text-muted-foreground">Since {kpis.since}.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Active merchants" value={kpis.activeMerchants} icon={<Users className="h-4 w-4" aria-hidden="true" />} />
        <StatCard label="Active creators" value={kpis.activeCreators} icon={<UserCheck className="h-4 w-4" aria-hidden="true" />} />
        <StatCard
          label="Liquidity ratio (creators / merchant)"
          value={kpis.liquidityRatio === null ? "Not enough data yet" : kpis.liquidityRatio}
          icon={<Scale3d className="h-4 w-4" aria-hidden="true" />}
        />
        <StatCard label="Click → sale conversion" value={kpis.clickToSaleConversionRate === null ? "Not enough data yet" : formatPercent(kpis.clickToSaleConversionRate)} />
        <StatCard label="Refund rate" value={kpis.refundRate === null ? "Not enough data yet" : formatPercent(kpis.refundRate)} />
        <StatCard label="Platform fee revenue" value={formatCurrency(kpis.platformFeeRevenueCents / 100)} />
        <StatCard label="Flagged sale rate" value={kpis.flaggedSaleRate === null ? "Not enough data yet" : formatPercent(kpis.flaggedSaleRate)} />
        <StatCard label="Flagged application rate" value={kpis.flaggedApplicationRate === null ? "Not enough data yet" : formatPercent(kpis.flaggedApplicationRate)} />
        <StatCard
          label="Avg. time to payout"
          value={kpis.timeToPayoutAvgHours === null ? "Not enough data yet" : `${Math.round(kpis.timeToPayoutAvgHours)}h`}
        />
      </div>

      {funnel && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FunnelCard title="Merchant funnel" stages={funnel.merchant.stages} />
          <FunnelCard title="Creator funnel" stages={funnel.creator.stages} />
        </div>
      )}
    </div>
  );
}

function FunnelCard({ title, stages }: { title: string; stages: RealFunnelStage[] }) {
  const max = Math.max(1, ...stages.map((s) => s.count));
  return (
    <Card className="p-5">
      <h2 className="mb-3 text-sm font-medium text-foreground">{title}</h2>
      <div className="space-y-3">
        {stages.map((stage) => (
          <div key={stage.stage}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{stage.stage.replace(/_/g, " ")}</span>
              <span className="font-medium text-foreground">{stage.count}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/5">
              <div className="h-full rounded-full bg-accent" style={{ width: `${(stage.count / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
