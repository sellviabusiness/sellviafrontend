"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Receipt, Download, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { Button } from "@/components/reference/ui/button";
import { Select } from "@/components/reference/ui/select";
import { StatusBadge, type StatusTone } from "@/components/reference/ui/status-badge";
import { Alert } from "@/components/reference/ui/alert";
import { listSales } from "@/lib/merchant/real-store";
import { formatCurrency } from "@/lib/merchant/format";
import { ApiError } from "@/lib/api";
import type { RealSale, RealSaleStatus } from "@/lib/merchant/types";

const STATUS_TONE: Record<RealSaleStatus, StatusTone> = {
  reported: "neutral",
  accepted: "success",
  rejected: "danger",
  billed: "success",
  refunded: "warning",
};

type SortKey = "date" | "amount";

/**
 * Real-mode counterpart to sales-view.tsx. No Offer/Creator columns — `RealSale` only carries an
 * opaque `affiliateLinkId`, and no merchant-facing endpoint resolves it to either (ask sent, see
 * RealSale's own doc comment in types.ts). Shows the order id instead, which is at least real and
 * matches what would show up in the merchant's own Shopify order history. No "Accept sale"
 * action anywhere — reported→accepted/rejected happens automatically inside the webhook handler,
 * confirmed by design, not a gap.
 */
export function RealSalesView() {
  const [ready, setReady] = useState(false);
  const [sales, setSales] = useState<RealSale[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setSales(await listSales());
      } catch (err) {
        setLoadError(err instanceof ApiError ? err.uiMessage : "Couldn't load your sales.");
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const sorted = [...sales].sort((a, b) =>
    sortKey === "date"
      ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      : b.amountCents - a.amountCents,
  );

  function handleExport() {
    setExporting(true);
    const header = "id,externalOrderId,amountCents,currency,status,billingCycleId,createdAt";
    const rows = sorted.map((s) => [s.id, s.externalOrderId, s.amountCents, s.currency, s.status, s.billingCycleId ?? "", s.createdAt].join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sellvia-sales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Sales</h1>
          <p className="text-sm text-muted-foreground">Receipts from purchases through your creators&apos; links.</p>
        </div>
        {sales.length > 0 && (
          <Button variant="secondary" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
            {exporting ? "Preparing export…" : "Export CSV"}
          </Button>
        )}
      </div>

      {loadError && <Alert variant="error">{loadError}</Alert>}

      {sales.length === 0 ? (
        <EmptyState icon={<Receipt className="h-5 w-5" aria-hidden="true" />} title="No sales yet" description="Sales through approved creators' links will show up here." />
      ) : (
        <>
          <div className="w-full max-w-[160px]">
            <Select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
              <option value="date">Sort: newest</option>
              <option value="amount">Sort: amount</option>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-foreground/5 text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-4 py-3 font-medium">Date</th>
                  <th scope="col" className="px-4 py-3 font-medium">Order</th>
                  <th scope="col" className="px-4 py-3 font-medium">Amount</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((sale) => (
                  <tr key={sale.id} className="border-b border-border last:border-0 hover:bg-foreground/[0.03]">
                    <td className="px-4 py-3 text-muted-foreground">{new Date(sale.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <Link href={`/merchant/sales/${sale.id}`} className="font-medium text-foreground hover:underline">
                        {sale.externalOrderId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-foreground">{formatCurrency(sale.amountCents / 100)}</td>
                    <td className="px-4 py-3"><StatusBadge tone={STATUS_TONE[sale.status]}>{sale.status}</StatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
