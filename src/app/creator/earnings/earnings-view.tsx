"use client";

import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { StatusBadge, type StatusTone } from "@/components/reference/ui/status-badge";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { getCreatorEarningsSummary } from "@/lib/merchant/store";
import { getCreatorPayoutRequests, getCreatorPendingPayoutAmount, requestCreatorPayout, markPayoutRequestPaid } from "@/lib/creator/store";
import { deriveCreatorId } from "@/lib/creator/identity";
import { PAYOUT_THRESHOLD_PKR } from "@/lib/creator/constants";
import { formatCurrency } from "@/lib/merchant/format";
import type { PayoutRequestStatus } from "@/lib/merchant/types";

const STATUS_TONE: Record<PayoutRequestStatus, StatusTone> = { processing: "warning", paid: "success" };

/**
 * E7 — balance of billed-and-charged commissions only (lib/merchant/store.ts's
 * getCreatorEarningsSummary, distinct from totalEarned), progress toward the PKR payout
 * threshold, payout history. "Never cached — always live": every value below is read straight
 * from the store on each mount/refresh() call, no memoization/caching layer sits in front of it —
 * flagged here so a future change doesn't quietly add one.
 */
export function EarningsView({ email }: { email: string }) {
  const creatorId = deriveCreatorId(email);
  const [ready, setReady] = useState(false);
  const [summary, setSummary] = useState({ billedAndCharged: 0, totalEarned: 0, saleCount: 0 });
  const [pending, setPending] = useState(0);
  const [requests, setRequests] = useState<ReturnType<typeof getCreatorPayoutRequests>>([]);
  const [requesting, setRequesting] = useState(false);

  async function refresh() {
    const [summaryRes, pendingRes] = await Promise.all([getCreatorEarningsSummary(creatorId), getCreatorPendingPayoutAmount(email)]);
    setSummary(summaryRes);
    setPending(pendingRes);
    setRequests(getCreatorPayoutRequests(email));
  }

  useEffect(() => {
    // localStorage is client-only — can't read during the server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh().then(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const meetsThreshold = pending >= PAYOUT_THRESHOLD_PKR;

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }

  async function handleRequestPayout() {
    setRequesting(true);
    await requestCreatorPayout(email);
    setRequesting(false);
    refresh();
  }

  function handleSimulatePaid(requestId: string) {
    markPayoutRequestPaid(email, requestId);
    refresh();
  }

  const progress = Math.min(100, (pending / PAYOUT_THRESHOLD_PKR) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Earnings</h1>
        <p className="text-sm text-muted-foreground">Billed-and-charged commission only — always live, never cached.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Available balance</p>
          <p className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold text-foreground">{formatCurrency(pending)}</p>
          <p className="mt-1 text-xs text-muted-foreground-2">{formatCurrency(summary.billedAndCharged)} billed and charged total, minus already-requested payouts.</p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Progress to payout threshold</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{formatCurrency(pending)} / {formatCurrency(PAYOUT_THRESHOLD_PKR)}</p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
          <Button className="mt-4 w-full" onClick={handleRequestPayout} loading={requesting} disabled={!meetsThreshold}>
            {meetsThreshold ? "Request payout" : `Reach ${formatCurrency(PAYOUT_THRESHOLD_PKR)} to request a payout`}
          </Button>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-medium text-foreground">Payout history</h2>
        {requests.length === 0 ? (
          <EmptyState icon={<Wallet className="h-5 w-5" aria-hidden="true" />} title="No payouts yet" description="Your requested payouts will show up here." />
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-foreground/5 text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-4 py-3 font-medium">Date</th>
                  <th scope="col" className="px-4 py-3 font-medium">Amount</th>
                  <th scope="col" className="px-4 py-3 font-medium">Method</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-muted-foreground">{new Date(r.requestedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-foreground">{formatCurrency(r.amount)}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{r.method}</td>
                    <td className="px-4 py-3"><StatusBadge tone={STATUS_TONE[r.status]}>{r.status}</StatusBadge></td>
                    <td className="px-4 py-3 text-right">
                      {r.status === "processing" && (
                        <button
                          type="button"
                          onClick={() => handleSimulatePaid(r.id)}
                          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                        >
                          Simulate completion (dev)
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
