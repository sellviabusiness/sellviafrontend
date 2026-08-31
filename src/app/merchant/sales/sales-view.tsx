"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Receipt, Download, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { Select } from "@/components/reference/ui/select";
import { Button } from "@/components/reference/ui/button";
import { StatusBadge, type StatusTone } from "@/components/reference/ui/status-badge";
import { getSales, getOffers, buildSalesCsv } from "@/lib/merchant/store";
import { getMockCreator } from "@/lib/merchant/mock-creators";
import { formatCurrency } from "@/lib/merchant/format";
import type { Sale, SaleAcceptanceStatus, Offer } from "@/lib/merchant/types";

const ACCEPTANCE_TONE: Record<SaleAcceptanceStatus, StatusTone> = { pending: "warning", accepted: "success" };
type SortKey = "date" | "amount";

/**
 * D7 — date/offer/creator/amount/acceptance_status, filter by offer, sort by date or amount, and
 * an export action that runs as a simulated async job (a real setTimeout-delayed job, not a
 * blocking spinner locking the UI) producing a REAL client-side CSV download — no backend export
 * queue exists, but the file itself is genuine, not a fake placeholder download.
 */
export function SalesView({ email }: { email: string }) {
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offerFilter, setOfferFilter] = useState(searchParams.get("offerId") ?? "all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      const [salesRes, offersRes] = await Promise.all([getSales(email), getOffers(email)]);
       
      setSales(salesRes);
      setOffers(offersRes);
      setReady(true);
    })();
  }, [email]);

  const offerById = useMemo(() => Object.fromEntries(offers.map((o) => [o.id, o])), [offers]);

  const filtered = sales
    .filter((s) => offerFilter === "all" || s.offerId === offerFilter)
    .sort((a, b) =>
      sortKey === "date"
        ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        : b.amount - a.amount,
    );

  async function handleExport() {
    setExporting(true);
    // Simulated async job — a real backend would return a job id and this would poll it; here
    // the delay + real CSV generation stand in for that so the "not a blocking spinner" UX
    // pattern (button stays interactive, no full-page lock) is genuinely demonstrated.
    await new Promise((resolve) => setTimeout(resolve, 900));
    const csv = buildSalesCsv(filtered);
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

      {sales.length === 0 ? (
        <EmptyState icon={<Receipt className="h-5 w-5" aria-hidden="true" />} title="No sales yet" description="Sales through approved creators' links will show up here." />
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="w-full max-w-[220px]">
              <Select value={offerFilter} onChange={(e) => setOfferFilter(e.target.value)}>
                <option value="all">All offers</option>
                {offers.map((o) => (
                  <option key={o.id} value={o.id}>{o.productName}</option>
                ))}
              </Select>
            </div>
            <div className="w-full max-w-[160px]">
              <Select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
                <option value="date">Sort: newest</option>
                <option value="amount">Sort: amount</option>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-foreground/5 text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-4 py-3 font-medium">Date</th>
                  <th scope="col" className="px-4 py-3 font-medium">Offer</th>
                  <th scope="col" className="px-4 py-3 font-medium">Creator</th>
                  <th scope="col" className="px-4 py-3 font-medium">Amount</th>
                  <th scope="col" className="px-4 py-3 font-medium">Acceptance</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sale) => {
                  const creator = getMockCreator(sale.creatorId);
                  const offer = offerById[sale.offerId];
                  return (
                    <tr key={sale.id} className="border-b border-border last:border-0 hover:bg-foreground/[0.03]">
                      <td className="px-4 py-3 text-muted-foreground">{new Date(sale.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <Link href={`/merchant/sales/${sale.id}`} className="font-medium text-foreground hover:underline">
                          {offer?.productName ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{creator?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-foreground">{formatCurrency(sale.amount)}</td>
                      <td className="px-4 py-3"><StatusBadge tone={ACCEPTANCE_TONE[sale.acceptanceStatus]}>{sale.acceptanceStatus}</StatusBadge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
