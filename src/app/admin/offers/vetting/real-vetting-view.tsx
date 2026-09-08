"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { Alert } from "@/components/reference/ui/alert";
import { NoteConfirmDialog } from "@/components/admin/note-confirm-dialog";
import { listPendingVetting, approveVetting, rejectVetting } from "@/lib/admin/real-store";
import { formatCurrency } from "@/lib/merchant/format";
import { ApiError } from "@/lib/api";
import type { RealOffer } from "@/lib/merchant/types";

/**
 * Real-mode counterpart to vetting-view.tsx. No merchant email/name on RealOffer — only
 * merchantProfileId (opaque), so the row identifies the offer by name/price/commission only.
 * No "flagged reason" either (the mock's synthetic vetting record has one; the real queue is
 * just "commission ≥ threshold", full stop). Reject requires a note (moves pending_vetting →
 * draft, not a terminal rejection — see real-store.ts's doc comment); approve takes none.
 */
export function RealVettingView() {
  const [items, setItems] = useState<RealOffer[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<RealOffer | null>(null);
  const [note, setNote] = useState("");

  async function refresh() {
    try {
      setItems(await listPendingVetting());
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.uiMessage : "Couldn't load the vetting queue.");
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  async function approve(offer: RealOffer) {
    setBusyId(offer.id);
    try {
      await approveVetting(offer.id);
      await refresh();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    try {
      await rejectVetting(rejectTarget.id, note);
      setRejectTarget(null);
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
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Offer vetting</h1>
        <p className="text-sm text-muted-foreground">Offers above the high-commission threshold, held for approval before going live.</p>
      </div>

      {loadError && <Alert variant="error">{loadError}</Alert>}
      {actionError && <Alert variant="error">{actionError}</Alert>}

      {items.length === 0 ? (
        <EmptyState icon={<ClipboardCheck className="h-5 w-5" aria-hidden="true" />} title="Queue is empty" description="Nothing pending vetting right now." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatCurrency(item.priceCents / 100)} · {item.commissionRate}% commission · merchant {item.merchantProfileId}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busyId === item.id}
                    onClick={() => setRejectTarget(item)}
                    className="border-danger-border text-danger hover:bg-danger-bg"
                  >
                    Reject
                  </Button>
                  <Button type="button" variant="primary" disabled={busyId === item.id} onClick={() => approve(item)}>
                    Approve
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <NoteConfirmDialog
        open={rejectTarget !== null}
        title={`Reject "${rejectTarget?.name}"?`}
        description="Sends it back to draft — the merchant's only path forward is deleting it and submitting a fresh one. A note is required."
        confirmLabel="Reject offer"
        destructive
        note={note}
        onNoteChange={setNote}
        noteLabel="Reason (required)"
        confirmDisabled={note.trim().length === 0 || busyId === rejectTarget?.id}
        onConfirm={confirmReject}
        onCancel={() => {
          setRejectTarget(null);
          setNote("");
        }}
      />
    </div>
  );
}
