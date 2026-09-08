"use client";

import { useEffect, useState } from "react";
import { Receipt, Scale } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { Alert } from "@/components/reference/ui/alert";
import { NoteConfirmDialog } from "@/components/admin/note-confirm-dialog";
import { listPendingRefundRequests, approveRefundRequest, denyRefundRequest } from "@/lib/admin/real-store";
import { formatCurrency } from "@/lib/merchant/format";
import { ApiError } from "@/lib/api";
import type { RealRefundRequest } from "@/lib/merchant/types";

/**
 * Real-mode counterpart to refunds-disputes-view.tsx — refund-requests half only. Chargebacks
 * have no real endpoint at all (blocked on the Switch integration; confirmed, not just unbuilt),
 * so faking that manual-entry form here would be actively misleading — it's replaced with a
 * plain "not available yet" notice instead of fake data. No merchant email/offer name on
 * RealRefundRequest — only merchantProfileId/saleId (opaque ids), same gap shape as elsewhere.
 */
export function RealRefundsDisputesView() {
  const [requests, setRequests] = useState<RealRefundRequest[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [denyTarget, setDenyTarget] = useState<RealRefundRequest | null>(null);
  const [note, setNote] = useState("");

  async function refresh() {
    try {
      setRequests(await listPendingRefundRequests());
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.uiMessage : "Couldn't load refund requests.");
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  async function approve(request: RealRefundRequest) {
    setBusyId(request.id);
    try {
      await approveRefundRequest(request.id);
      await refresh();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDeny() {
    if (!denyTarget) return;
    setBusyId(denyTarget.id);
    try {
      await denyRefundRequest(denyTarget.id, note);
      setDenyTarget(null);
      setNote("");
      await refresh();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Refunds & disputes</h1>
        <p className="text-sm text-muted-foreground">Pending refund-credit requests. Chargebacks aren&apos;t available yet — see below.</p>
      </div>

      {loadError && <Alert variant="error">{loadError}</Alert>}
      {actionError && <Alert variant="error">{actionError}</Alert>}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Receipt className="h-4 w-4" aria-hidden="true" /> Pending refund-credit requests
        </h2>
        {requests.length === 0 ? (
          <EmptyState icon={<Receipt className="h-5 w-5" aria-hidden="true" />} title="Nothing pending" description="No open refund-credit requests." />
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <Card key={req.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Sale {req.saleId.slice(0, 8)}…</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      merchant {req.merchantProfileId.slice(0, 8)}… · requesting {formatCurrency(req.requestedAmountCents / 100)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busyId === req.id}
                      className="border-danger-border text-danger hover:bg-danger-bg"
                      onClick={() => setDenyTarget(req)}
                    >
                      Deny
                    </Button>
                    <Button type="button" variant="primary" disabled={busyId === req.id} onClick={() => approve(req)}>
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
        <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Scale className="h-4 w-4" aria-hidden="true" /> Chargebacks
        </h2>
        <EmptyState
          icon={<Scale className="h-5 w-5" aria-hidden="true" />}
          title="Not available yet"
          description="Chargeback reporting depends on the Switch integration, which isn't wired up yet — no endpoint exists to list or report one."
        />
      </section>

      <NoteConfirmDialog
        open={denyTarget !== null}
        title="Deny this refund request?"
        description="A note is required."
        confirmLabel="Deny request"
        destructive
        note={note}
        onNoteChange={setNote}
        noteLabel="Reason (required)"
        confirmDisabled={note.trim().length === 0 || busyId === denyTarget?.id}
        onConfirm={confirmDeny}
        onCancel={() => {
          setDenyTarget(null);
          setNote("");
        }}
      />
    </div>
  );
}
