"use client";

import { useEffect, useState } from "react";
import { Receipt, Scale, Plus } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { Input } from "@/components/reference/ui/input";
import { Textarea } from "@/components/reference/ui/textarea";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { StatusBadge, type StatusTone } from "@/components/reference/ui/status-badge";
import {
  getPendingRefundRequests,
  decideRefundRequest,
  getChargebacks,
  reportChargeback,
  submitChargebackEvidence,
  resolveChargeback,
} from "@/lib/admin/store";
import type { OwnedSale } from "@/lib/merchant/store";
import type { Chargeback, ChargebackStatus } from "@/lib/admin/types";
import { formatCurrency } from "@/lib/merchant/format";

const CB_TONE: Record<ChargebackStatus, StatusTone> = { open: "warning", evidence_submitted: "neutral", won: "success", lost: "danger" };

export function RefundsDisputesView({ actorEmail }: { actorEmail: string }) {
  const [refunds, setRefunds] = useState<OwnedSale[]>([]);
  const [chargebacks, setChargebacks] = useState<Chargeback[]>([]);
  const [evidenceDraft, setEvidenceDraft] = useState<Record<string, string>>({});
  const [reportOpen, setReportOpen] = useState(false);
  const [reportEmail, setReportEmail] = useState("");
  const [reportSaleId, setReportSaleId] = useState("");
  const [reportAmount, setReportAmount] = useState("");

  async function refresh() {
    setRefunds(await getPendingRefundRequests());
    setChargebacks(getChargebacks());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  async function decideRefund(merchantEmail: string, saleId: string, decision: "approved" | "denied") {
    await decideRefundRequest(merchantEmail, saleId, decision, actorEmail);
    refresh();
  }

  function submitReport() {
    if (!reportEmail || !reportSaleId || !reportAmount) return;
    reportChargeback(reportEmail, reportSaleId, Number(reportAmount), actorEmail);
    setReportOpen(false);
    setReportEmail("");
    setReportSaleId("");
    setReportAmount("");
    refresh();
  }

  function submitEvidence(id: string) {
    const evidence = evidenceDraft[id]?.trim();
    if (!evidence) return;
    submitChargebackEvidence(id, evidence, actorEmail);
    setEvidenceDraft((d) => ({ ...d, [id]: "" }));
    refresh();
  }

  function resolve(id: string, outcome: "won" | "lost") {
    resolveChargeback(id, outcome, actorEmail);
    refresh();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Refunds & disputes</h1>
        <p className="text-sm text-muted-foreground">Pending refund-credit requests and open Switch chargebacks.</p>
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Receipt className="h-4 w-4" aria-hidden="true" /> Pending refund-credit requests
        </h2>
        {refunds.length === 0 ? (
          <EmptyState icon={<Receipt className="h-5 w-5" aria-hidden="true" />} title="Nothing pending" description="No open refund-credit requests." />
        ) : (
          <div className="space-y-3">
            {refunds.map(({ merchantEmail, offer, sale }) => (
              <Card key={sale.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{offer.productName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {merchantEmail} · sale {sale.id} · {formatCurrency(sale.amount)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button type="button" variant="secondary" className="border-danger-border text-danger hover:bg-danger-bg" onClick={() => decideRefund(merchantEmail, sale.id, "denied")}>
                      Deny
                    </Button>
                    <Button type="button" variant="primary" onClick={() => decideRefund(merchantEmail, sale.id, "approved")}>
                      Approve
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Scale className="h-4 w-4" aria-hidden="true" /> Chargebacks
          </h2>
          <Button type="button" variant="secondary" onClick={() => setReportOpen((v) => !v)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Report chargeback
          </Button>
        </div>

        {reportOpen && (
          <Card className="space-y-3 p-4">
            <p className="text-xs text-muted-foreground">
              Real trigger is a Switch webhook — this manual entry stands in for that until one exists.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input value={reportEmail} onChange={(e) => setReportEmail(e.target.value)} placeholder="Merchant email" />
              <Input value={reportSaleId} onChange={(e) => setReportSaleId(e.target.value)} placeholder="Sale id" />
              <Input value={reportAmount} onChange={(e) => setReportAmount(e.target.value)} placeholder="Amount" type="number" />
            </div>
            <Button type="button" variant="primary" onClick={submitReport}>
              Submit
            </Button>
          </Card>
        )}

        {chargebacks.length === 0 ? (
          <EmptyState icon={<Scale className="h-5 w-5" aria-hidden="true" />} title="No chargebacks" description="Nothing reported yet." />
        ) : (
          <div className="space-y-3">
            {chargebacks.map((cb) => (
              <Card key={cb.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <StatusBadge tone={CB_TONE[cb.status]}>{cb.status.replace(/_/g, " ")}</StatusBadge>
                    </div>
                    <p className="text-sm text-foreground">
                      {cb.merchantEmail} · sale {cb.saleId} · {formatCurrency(cb.amount)}
                    </p>
                    {cb.evidence && <p className="mt-1 text-xs text-muted-foreground">Evidence: {cb.evidence}</p>}
                  </div>
                  {(cb.status === "open" || cb.status === "evidence_submitted") && (
                    <div className="flex shrink-0 gap-2">
                      <Button type="button" variant="secondary" className="border-danger-border text-danger hover:bg-danger-bg" onClick={() => resolve(cb.id, "lost")}>
                        Mark lost
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => resolve(cb.id, "won")}>
                        Mark won
                      </Button>
                    </div>
                  )}
                </div>
                {cb.status === "open" && (
                  <div className="flex gap-2">
                    <Textarea
                      value={evidenceDraft[cb.id] ?? ""}
                      onChange={(e) => setEvidenceDraft((d) => ({ ...d, [cb.id]: e.target.value }))}
                      placeholder="Dispute evidence"
                      rows={2}
                      className="flex-1"
                    />
                    <Button type="button" variant="secondary" onClick={() => submitEvidence(cb.id)}>
                      Submit
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
