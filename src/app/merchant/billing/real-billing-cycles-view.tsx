"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { StatusBadge, type StatusTone } from "@/components/reference/ui/status-badge";
import { Alert } from "@/components/reference/ui/alert";
import { listBillingCycles } from "@/lib/merchant/real-store";
import { formatCurrency } from "@/lib/merchant/format";
import { ApiError } from "@/lib/api";
import type { RealBillingCycle, RealBillingCycleStatus } from "@/lib/merchant/types";

const STATUS_TONE: Record<RealBillingCycleStatus, StatusTone> = {
  open: "neutral",
  pending_charge: "warning",
  charged: "success",
  failed: "danger",
  retrying: "warning",
  suspended: "danger",
};
const STATUS_LABEL: Record<RealBillingCycleStatus, string> = {
  open: "Open",
  pending_charge: "Pending charge",
  charged: "Charged",
  failed: "Failed",
  retrying: "Retrying",
  suspended: "Suspended",
};

/**
 * Real-mode counterpart to billing-cycles-view.tsx. No "Retry" action — billing-cycle state
 * changes are cron/webhook-driven in the real model (dev-only /dev/billing/* simulates them),
 * never a merchant-initiated call. Two extra real statuses the mock never had: `retrying` and
 * `suspended`.
 */
export function RealBillingCyclesView() {
  const [ready, setReady] = useState(false);
  const [cycles, setCycles] = useState<RealBillingCycle[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setCycles(await listBillingCycles());
      } catch (err) {
        setLoadError(err instanceof ApiError ? err.uiMessage : "Couldn't load your billing cycles.");
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground">Commission owed to creators, billed to you per cycle.</p>
      </div>

      {loadError && <Alert variant="error">{loadError}</Alert>}

      {cycles.length === 0 ? (
        <EmptyState icon={<CreditCard className="h-5 w-5" aria-hidden="true" />} title="No billing cycles yet" description="Cycles appear once you have sales to bill." />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-foreground/5 text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-medium">Period</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 font-medium">Total owed</th>
                <th scope="col" className="px-4 py-3 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {cycles.map((cycle) => (
                <tr key={cycle.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-foreground">
                    {new Date(cycle.periodStart).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3"><StatusBadge tone={STATUS_TONE[cycle.status]}>{STATUS_LABEL[cycle.status]}</StatusBadge></td>
                  <td className="px-4 py-3 text-foreground">{formatCurrency(cycle.amountCents / 100)}</td>
                  <td className="px-4 py-3 text-right">
                    {(cycle.status === "failed" || cycle.status === "suspended") && (
                      <Link href="/merchant/settings/billing" className="inline-flex items-center rounded-[var(--radius-sm)] border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-border-hover">
                        Update payment method
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
