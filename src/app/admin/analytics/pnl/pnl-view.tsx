"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { Input } from "@/components/reference/ui/input";
import { computeMonthlyPnl, finalizeMonthlyPnl, addManualCostEntry, getManualCostEntries, PLATFORM_FEE_RATE } from "@/lib/admin/store";
import type { MonthlyPnl, ManualCostEntry } from "@/lib/admin/types";
import { formatCurrency } from "@/lib/merchant/format";

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/** G10 P&L — platform-fee revenue is real (sum of Sale.platformFee), everything else is either a
 *  manual entry or an honest zero (see lib/admin/store.ts's computeMonthlyPnl doc comment). Real
 *  formula per Analytics/Automated Monthly P&L: revenue − (Switch fees + hosting + AI + other
 *  SaaS). Finalize locks the month; later corrections are new manual-cost entries, never an
 *  in-place edit of a finalized report. */
export function PnlView({ actorEmail }: { actorEmail: string }) {
  const [month] = useState(currentMonth());
  const [pnl, setPnl] = useState<MonthlyPnl | null>(null);
  const [costs, setCosts] = useState<ManualCostEntry[]>([]);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");

  async function refresh() {
    setPnl(await computeMonthlyPnl(month));
    setCosts(getManualCostEntries(month));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  function addCost() {
    if (!label.trim() || !amount) return;
    addManualCostEntry(month, label.trim(), Number(amount), actorEmail);
    setLabel("");
    setAmount("");
    refresh();
  }

  async function finalize() {
    await finalizeMonthlyPnl(month, actorEmail);
    refresh();
  }

  if (!pnl) return null;

  const totalCosts = pnl.switchProcessingFees + pnl.hostingCosts + pnl.aiCosts + pnl.otherSaasCosts;
  const net = Math.round((pnl.platformFeeRevenue - totalCosts) * 100) / 100;

  return (
    <div className="space-y-6">
      <Link href="/admin/analytics" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to analytics
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Monthly P&L — {month}</h1>
          <p className="text-sm text-muted-foreground">Platform fee revenue at {(PLATFORM_FEE_RATE * 100).toFixed(0)}% of GMV, minus known cost lines.</p>
        </div>
        {pnl.finalized ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Finalized
          </span>
        ) : (
          <Button type="button" variant="primary" onClick={finalize}>
            Finalize month
          </Button>
        )}
      </div>

      <Card className="p-0">
        <table className="w-full text-sm">
          <tbody>
            <Row label="Platform fee revenue" value={pnl.platformFeeRevenue} positive />
            <Row label="Switch processing fees" value={-pnl.switchProcessingFees} note={pnl.switchProcessingFees === 0 ? "not yet integrated" : undefined} />
            <Row label="Hosting" value={-pnl.hostingCosts} />
            <Row label="AI / token costs" value={-pnl.aiCosts} note={pnl.aiCosts === 0 ? "no real AI usage logged yet" : undefined} />
            <Row label="Other SaaS" value={-pnl.otherSaasCosts} />
            <tr className="border-t border-border">
              <td className="px-4 py-3 text-sm font-semibold text-foreground">Net</td>
              <td className={`px-4 py-3 text-right text-sm font-semibold ${net >= 0 ? "text-success" : "text-danger"}`}>{formatCurrency(net)}</td>
            </tr>
          </tbody>
        </table>
      </Card>

      {!pnl.finalized && (
        <Card className="space-y-3 p-4">
          <p className="text-sm font-medium text-foreground">Add a manual cost entry</p>
          <p className="text-xs text-muted-foreground">For hosting/other SaaS — sources with no billing API integrated yet.</p>
          <div className="flex flex-wrap gap-3">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (e.g. Hosting — Hetzner)" className="max-w-xs" />
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" type="number" className="max-w-[140px]" />
            <Button type="button" variant="secondary" onClick={addCost}>
              Add
            </Button>
          </div>
          {costs.length > 0 && (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {costs.map((c) => (
                <li key={c.id}>
                  {c.label}: {formatCurrency(c.amount)}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

function Row({ label, value, note, positive }: { label: string; value: number; note?: string; positive?: boolean }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-3 text-sm text-foreground">
        {label}
        {note && <span className="ml-2 text-xs text-muted-foreground-2">({note})</span>}
      </td>
      <td className={`px-4 py-3 text-right text-sm ${positive ? "text-success" : "text-muted-foreground"}`}>{formatCurrency(value)}</td>
    </tr>
  );
}
