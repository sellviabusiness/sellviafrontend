"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { StatusBadge, type StatusTone } from "@/components/reference/ui/status-badge";
import { getSale, getOffer, acceptSale, requestRefundCredit } from "@/lib/merchant/store";
import { getMockCreator } from "@/lib/merchant/mock-creators";
import { formatCurrency } from "@/lib/merchant/format";
import type { Sale, SaleAcceptanceStatus, Offer } from "@/lib/merchant/types";

const ACCEPTANCE_TONE: Record<SaleAcceptanceStatus, StatusTone> = { pending: "warning", accepted: "success" };

/**
 * D8 — Receipt: amount, commission split, platform fee, billing-cycle link, Request Refund
 * Credit with cap state. "Symmetric" to what the creator sees per D8's requirement: this exact
 * layout — one Receipt record, one set of numbers, shown from whichever side is looking at it —
 * is the intended shared shape; the Creator-side mirror screen isn't built here (Creator
 * Dashboard is a separate, not-yet-started feature), but nothing about this layout is
 * merchant-specific, so it's ready to reuse as-is once that screen exists.
 */
export function SaleDetailView({ email, saleId }: { email: string; saleId: string }) {
  const [sale, setSale] = useState<Sale | null | undefined>(undefined);
  const [offer, setOffer] = useState<Offer | undefined>();
  const [busy, setBusy] = useState(false);
  const [refundBlockedReason, setRefundBlockedReason] = useState<"already_requested" | "monthly_cap_reached" | null>(null);

  async function refresh() {
    const found = (await getSale(email, saleId)) ?? null;
    setSale(found);
    if (found) setOffer(await getOffer(email, found.offerId));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, saleId]);

  if (sale === undefined) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }
  if (sale === null) {
    return <p className="text-sm text-muted-foreground">Sale not found.</p>;
  }

  const creator = getMockCreator(sale.creatorId);
  const d = new Date(sale.createdAt);
  const cycleId = `cycle_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  async function handleAccept() {
    setBusy(true);
    await acceptSale(email, saleId);
    setBusy(false);
    refresh();
  }

  async function handleRefundRequest() {
    setBusy(true);
    const result = await requestRefundCredit(email, saleId);
    setRefundBlockedReason(result && !result.ok ? result.reason : null);
    setBusy(false);
    refresh();
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Receipt</h1>
          <p className="text-sm text-muted-foreground">{d.toLocaleDateString()} · {offer?.productName ?? "—"}</p>
        </div>
        <StatusBadge tone={ACCEPTANCE_TONE[sale.acceptanceStatus]}>{sale.acceptanceStatus}</StatusBadge>
      </div>

      <Card className="divide-y divide-border p-0">
        <Row label="Creator" value={creator?.name ?? "—"} />
        <Row label="Sale amount" value={formatCurrency(sale.amount)} />
        <Row label="Creator commission" value={`− ${formatCurrency(sale.commissionAmount)}`} muted />
        <Row label="Platform fee" value={`− ${formatCurrency(sale.platformFee)}`} muted />
        <Row label="You keep" value={formatCurrency(sale.merchantAmount)} strong />
      </Card>

      <Card className="p-5">
        <p className="text-xs font-medium text-muted-foreground">Billing cycle</p>
        <Link href="/merchant/billing" className="text-sm text-accent underline underline-offset-2">
          {cycleId.replace("cycle_", "")}
        </Link>
      </Card>

      {sale.acceptanceStatus === "pending" && (
        <Button className="w-full" variant="secondary" onClick={handleAccept} loading={busy}>
          Accept sale
        </Button>
      )}

      <Card className="p-5">
        <p className="mb-2 text-sm font-medium text-foreground">Refund credit</p>
        {sale.refundCreditStatus === "none" ? (
          <>
            <p className="mb-3 text-xs text-muted-foreground-2">
              Up to {formatCurrency(sale.commissionAmount)} (the commission paid on this sale) — capped at 5 credits per calendar month.
            </p>
            <Button variant="secondary" onClick={handleRefundRequest} loading={busy}>Request refund credit</Button>
            {refundBlockedReason === "already_requested" && (
              <p className="mt-2 text-xs text-danger">A request already exists for this sale.</p>
            )}
            {refundBlockedReason === "monthly_cap_reached" && (
              <p className="mt-2 text-xs text-danger">You&apos;ve used all 5 refund credits for this calendar month.</p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Status: <span className="font-medium text-foreground capitalize">{sale.refundCreditStatus}</span>
          </p>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value, muted, strong }: { label: string; value: string; muted?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "text-base font-semibold text-foreground" : muted ? "text-muted-foreground-2" : "text-foreground"}>
        {value}
      </span>
    </div>
  );
}
