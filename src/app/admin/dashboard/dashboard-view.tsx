"use client";

import { useEffect, useState } from "react";
import { Users, UserCheck, Scale3d, TrendingUp } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { StatCard } from "@/components/reference/ui/stat-card";
import {
  getMarketplaceHealth,
  getMerchantFunnel,
  getCreatorFunnel,
  getTimeToPayoutTrend,
  type MarketplaceHealth,
  type FunnelStep,
  type TimeToPayoutPoint,
} from "@/lib/admin/store";

/** G1 — Admin Dashboard. All numbers real, computed live from the mock store (getMarketplaceHealth
 *  etc.) — nothing hardcoded, per Playbook 07's own "flag, don't invent" rule on anything not yet
 *  backed by real data (the time-to-payout / liquidity-ratio window sizes are the one exception:
 *  real, documented 30-day/definitional windows, not placeholders). */
export function DashboardView() {
  const [ready, setReady] = useState(false);
  const [health, setHealth] = useState<MarketplaceHealth | null>(null);
  const [merchantFunnel, setMerchantFunnel] = useState<FunnelStep[]>([]);
  const [creatorFunnel, setCreatorFunnel] = useState<FunnelStep[]>([]);
  const [payoutTrend, setPayoutTrend] = useState<TimeToPayoutPoint[]>([]);

  useEffect(() => {
    (async () => {
      const [healthRes, merchantFunnelRes, creatorFunnelRes] = await Promise.all([
        getMarketplaceHealth(),
        getMerchantFunnel(),
        getCreatorFunnel(),
      ]);
       
      setHealth(healthRes);
      setMerchantFunnel(merchantFunnelRes);
      setCreatorFunnel(creatorFunnelRes);
      setPayoutTrend(getTimeToPayoutTrend());
      setReady(true);
    })();
  }, []);

  if (!ready || !health) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Marketplace health</h1>
        <p className="text-sm text-muted-foreground">Active accounts and liquidity, last 30 days.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Active merchants" value={health.activeMerchants} icon={<Users className="h-4 w-4" aria-hidden="true" />} />
        <StatCard label="Active creators" value={health.activeCreators} icon={<UserCheck className="h-4 w-4" aria-hidden="true" />} />
        <StatCard
          label="Liquidity ratio (creators / merchant)"
          value={health.liquidityRatio === null ? "Not enough data yet" : health.liquidityRatio}
          icon={<Scale3d className="h-4 w-4" aria-hidden="true" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FunnelCard title="Merchant funnel" steps={merchantFunnel} />
        <FunnelCard title="Creator funnel" steps={creatorFunnel} />
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground-2" aria-hidden="true" />
          <h2 className="text-sm font-medium text-foreground">Time to payout — last 6 months</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">Month</th>
                <th className="pb-2 font-medium">Avg. days to payout</th>
                <th className="pb-2 font-medium">Paid requests</th>
              </tr>
            </thead>
            <tbody>
              {payoutTrend.map((p) => (
                <tr key={p.month} className="border-t border-border">
                  <td className="py-2 text-foreground">{p.month}</td>
                  <td className="py-2 text-foreground">{p.avgDays === null ? "Not enough data yet" : `${p.avgDays}d`}</td>
                  <td className="py-2 text-muted-foreground">{p.paidCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function FunnelCard({ title, steps }: { title: string; steps: FunnelStep[] }) {
  const max = Math.max(1, ...steps.map((s) => s.count));
  return (
    <Card className="p-5">
      <h2 className="mb-3 text-sm font-medium text-foreground">{title}</h2>
      <div className="space-y-3">
        {steps.map((step) => (
          <div key={step.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{step.label}</span>
              <span className="font-medium text-foreground">{step.count}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/5">
              <div className="h-full rounded-full bg-accent" style={{ width: `${(step.count / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
