"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { Button } from "@/components/reference/ui/button";
import { StatusBadge, type StatusTone } from "@/components/reference/ui/status-badge";
import { getBillingCycles, retryBillingCycle } from "@/lib/merchant/store";
import { formatCurrency } from "@/lib/merchant/format";
import type { BillingCycle, BillingCycleStatus } from "@/lib/merchant/types";

const STATUS_TONE: Record<BillingCycleStatus, StatusTone> = {
  open: "neutral",
  pending_charge: "warning",
  charged: "success",
  failed: "danger",
};
const STATUS_LABEL: Record<BillingCycleStatus, string> = {
  open: "Open",
  pending_charge: "Pending charge",
  charged: "Charged",
  failed: "Failed",
};

/**
 * D9 — cycle period, status, total owed, retry count, with a payment-method-update CTA on
 * failure. Cycles are computed from `sales` (store.ts's getBillingCycles), not their own written
 * table, so they can never drift from the sales they summarize — which also means "retry" here
 * is a LOCAL, in-memory-only state flip (not persisted to localStorage): a real billing system
 * tracks cycle/retry state server-side; this UI demonstrates the interaction, not a real retry
 * pipeline. Flagged rather than silently making it look like it persists.
 */
export function BillingCyclesView({ email }: { email: string }) {
  const [ready, setReady] = useState(false);
  const [cycles, setCycles] = useState<BillingCycle[]>([]);

  useEffect(() => {
    (async () => {
      const result = await getBillingCycles(email);
       
      setCycles(result);
      setReady(true);
    })();
  }, [email]);

  function handleRetry(cycleId: string) {
    setCycles((prev) => retryBillingCycle(prev, cycleId));
  }

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground">Commission owed to creators, billed to you per cycle.</p>
      </div>

      {cycles.length === 0 ? (
        <EmptyState icon={<CreditCard className="h-5 w-5" aria-hidden="true" />} title="No billing cycles yet" description="Cycles appear once you have sales to bill." />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-foreground/5 text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-medium">Period</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 font-medium">Total owed</th>
                <th scope="col" className="px-4 py-3 font-medium">Retries</th>
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
                  <td className="px-4 py-3 text-foreground">{formatCurrency(cycle.totalOwed)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{cycle.retryCount}</td>
                  <td className="px-4 py-3 text-right">
                    {cycle.status === "failed" && (
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => handleRetry(cycle.id)}>Retry</Button>
                        <Link href="/merchant/settings/billing" className="inline-flex items-center rounded-[var(--radius-sm)] border border-border px-3 text-xs font-medium text-foreground hover:border-border-hover">
                          Update payment method
                        </Link>
                      </div>
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
