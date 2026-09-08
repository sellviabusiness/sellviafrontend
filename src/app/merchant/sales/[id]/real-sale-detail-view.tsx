"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { Input } from "@/components/reference/ui/input";
import { Alert } from "@/components/reference/ui/alert";
import { StatusBadge, type StatusTone } from "@/components/reference/ui/status-badge";
import { FormErrorText } from "@/components/reference/ui/form-error-text";
import { listSales, requestRefund } from "@/lib/merchant/real-store";
import { formatCurrency } from "@/lib/merchant/format";
import { ApiError } from "@/lib/api";
import type { RealSale, RealSaleStatus, RealRefundRequest } from "@/lib/merchant/types";

const STATUS_TONE: Record<RealSaleStatus, StatusTone> = {
  reported: "neutral",
  accepted: "success",
  rejected: "danger",
  billed: "success",
  refunded: "warning",
};

/**
 * Real-mode counterpart to sale-detail-view.tsx. No commission/platform-fee breakdown — only the
 * raw sale amount is real here (RealSale's own doc comment, types.ts); no offer/creator name
 * either. Refund is now a request-then-wait flow, not instant credit — matches the real
 * SALE_NOT_REFUNDABLE / REFUND_REQUEST_ALREADY_PENDING errors rather than a hand-maintained cap
 * check (the actual 5/month limit is enforced server-side, at approval time, not here).
 */
export function RealSaleDetailView({ saleId }: { saleId: string }) {
  const [sale, setSale] = useState<RealSale | null | undefined>(undefined);
  const [amountInput, setAmountInput] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundRequest, setRefundRequest] = useState<RealRefundRequest | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const list = await listSales();
      setSale(list.find((s) => s.id === saleId) ?? null);
    } catch {
      setSale(null);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleId]);

  if (sale === undefined) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }
  if (sale === null) {
    return <p className="text-sm text-muted-foreground">Sale not found.</p>;
  }

  async function handleRequestRefund() {
    const cents = Math.round(Number(amountInput) * 100);
    if (!amountInput.trim() || Number.isNaN(cents) || cents <= 0) {
      setFieldError("Enter an amount above 0.");
      return;
    }
    if (cents > sale!.amountCents) {
      setFieldError(`Can't exceed the sale amount (${formatCurrency(sale!.amountCents / 100)}).`);
      return;
    }
    setFieldError(null);
    setRefundError(null);
    setBusy(true);
    try {
      const result = await requestRefund(saleId, cents);
      setRefundRequest(result);
    } catch (err) {
      setRefundError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Receipt</h1>
          <p className="text-sm text-muted-foreground">{new Date(sale.createdAt).toLocaleDateString()} · Order {sale.externalOrderId}</p>
        </div>
        <StatusBadge tone={STATUS_TONE[sale.status]}>{sale.status}</StatusBadge>
      </div>

      <Card className="divide-y divide-border p-0">
        <Row label="Sale amount (already yours via Shopify)" value={formatCurrency(sale.amountCents / 100)} strong />
        <Row label="Currency" value={sale.currency} />
      </Card>

      {sale.billingCycleId && (
        <Card className="p-5">
          <p className="text-xs font-medium text-muted-foreground">Billing cycle</p>
          <Link href="/merchant/billing" className="text-sm text-accent-foreground underline underline-offset-2">
            View billing
          </Link>
        </Card>
      )}

      {(sale.status === "accepted" || sale.status === "billed") && (
        <Card className="space-y-3 p-5">
          <p className="text-sm font-medium text-foreground">Refund request</p>
          {refundRequest ? (
            <p className="text-sm text-muted-foreground">
              Status: <span className="font-medium capitalize text-foreground">{refundRequest.status}</span>
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground-2">
                Up to {formatCurrency(sale.amountCents / 100)}. An admin reviews and approves before anything is credited — capped at 5 approved credits per calendar month.
              </p>
              {refundError && <Alert variant="error">{refundError}</Alert>}
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Amount"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  invalid={Boolean(fieldError)}
                  className="max-w-[160px]"
                />
                <Button variant="secondary" onClick={handleRequestRefund} loading={busy}>Request refund</Button>
              </div>
              {fieldError && <FormErrorText id="refund-amount-error">{fieldError}</FormErrorText>}
            </>
          )}
        </Card>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "text-base font-semibold text-foreground" : "text-foreground"}>{value}</span>
    </div>
  );
}
