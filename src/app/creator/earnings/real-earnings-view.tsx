"use client";

import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { Alert } from "@/components/reference/ui/alert";
import { StatusBadge, type StatusTone } from "@/components/reference/ui/status-badge";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { getWalletBalance, listPayouts, requestPayout } from "@/lib/creator/real-store";
import { formatCurrency } from "@/lib/merchant/format";
import { ApiError } from "@/lib/api";
import type { RealPayout, RealPayoutStatus } from "@/lib/merchant/types";

const STATUS_TONE: Record<RealPayoutStatus, StatusTone> = {
  pending: "neutral",
  processing: "warning",
  paid: "success",
  failed: "danger",
};

/**
 * Real-mode counterpart to earnings-view.tsx. No threshold/progress bar at all — the real model
 * has none (2026-08-28 founder decision reversed the mock's PKR-threshold design): monthly
 * cadence, full balance, no partial cashout. "Request payout" is just enabled/disabled on
 * balance > 0; the real 409s (NOTHING_TO_PAY_OUT, ALREADY_PAID_THIS_MONTH) explain the rest,
 * not a client-side guess at eligibility.
 */
export function RealEarningsView() {
  const [ready, setReady] = useState(false);
  const [balanceCents, setBalanceCents] = useState(0);
  const [payouts, setPayouts] = useState<RealPayout[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  async function refresh() {
    try {
      const [wallet, history] = await Promise.all([getWalletBalance(), listPayouts()]);
      setBalanceCents(wallet.balanceCents);
      setPayouts(history);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.uiMessage : "Couldn't load your earnings.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh().then(() => setReady(true));
  }, []);

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }

  async function handleRequestPayout() {
    setRequesting(true);
    setRequestError(null);
    try {
      await requestPayout();
      await refresh();
    } catch (err) {
      setRequestError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Earnings</h1>
        <p className="text-sm text-muted-foreground">A live wallet balance — computed fresh, never cached.</p>
      </div>

      {loadError && <Alert variant="error">{loadError}</Alert>}

      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Available balance</p>
        <p className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold text-foreground">{formatCurrency(balanceCents / 100)}</p>
        <p className="mt-1 text-xs text-muted-foreground-2">Paid out once a month, in full — no partial cashout, no minimum.</p>
        {requestError && <Alert variant="error" className="mt-3">{requestError}</Alert>}
        <Button className="mt-4 w-full" onClick={handleRequestPayout} loading={requesting} disabled={balanceCents <= 0}>
          Request payout
        </Button>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-medium text-foreground">Payout history</h2>
        {payouts.length === 0 ? (
          <EmptyState icon={<Wallet className="h-5 w-5" aria-hidden="true" />} title="No payouts yet" description="Your requested payouts will show up here." />
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-foreground/5 text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-4 py-3 font-medium">Date</th>
                  <th scope="col" className="px-4 py-3 font-medium">Amount</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-foreground">{formatCurrency(p.amountCents / 100)}</td>
                    <td className="px-4 py-3"><StatusBadge tone={STATUS_TONE[p.status]}>{p.status}</StatusBadge></td>
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
