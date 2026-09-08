"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserX, UserCheck } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { StatusBadge } from "@/components/reference/ui/status-badge";
import { NoteConfirmDialog } from "@/components/admin/note-confirm-dialog";
import { getTicketContext, isSuspended, suspendUser, unsuspendUser } from "@/lib/admin/store";
import { formatCurrency } from "@/lib/merchant/format";
import type { TicketContext } from "@/lib/admin/types";

/** G4 detail — the aggregated "ticket context" support/admin needs, plus the one real write
 *  action this screen owns (suspend/unsuspend). Suspend routes through the shared confirm+note
 *  dialog since ending a merchant's live offers is a real, disclosed side effect. */
export function UserDetailView({ email, actorEmail }: { email: string; actorEmail: string }) {
  const [context, setContext] = useState<TicketContext | null>(null);
  const [suspended, setSuspended] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [note, setNote] = useState("");

  async function refresh() {
    setContext(await getTicketContext(email));
    setSuspended(isSuspended(email));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  async function confirmSuspend() {
    await suspendUser(email, actorEmail, note || undefined);
    setConfirmOpen(false);
    setNote("");
    refresh();
  }

  function unsuspend() {
    unsuspendUser(email, actorEmail);
    refresh();
  }

  if (!context) return null;

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to users
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">{context.email}</h1>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge tone={suspended ? "danger" : "success"}>{suspended ? "Suspended" : "Active"}</StatusBadge>
            <span className="text-xs text-muted-foreground">{context.roles.join(", ") || "no role"}</span>
          </div>
        </div>
        {suspended ? (
          <Button type="button" variant="secondary" onClick={unsuspend}>
            <UserCheck className="h-4 w-4" aria-hidden="true" />
            Unsuspend
          </Button>
        ) : (
          <Button type="button" variant="secondary" className="border-danger-border text-danger hover:bg-danger-bg" onClick={() => setConfirmOpen(true)}>
            <UserX className="h-4 w-4" aria-hidden="true" />
            Suspend
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Offers</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{context.offerCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Applications</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{context.applicationCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Sales</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{context.saleCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Pending payout</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{formatCurrency(context.pendingPayoutAmount)}</p>
        </Card>
      </div>

      <NoteConfirmDialog
        open={confirmOpen}
        title={`Suspend ${email}?`}
        description="Ends every one of this account's live/paused offers. The account itself can be unsuspended later, but running offers won't automatically resume."
        confirmLabel="Suspend account"
        destructive
        note={note}
        onNoteChange={setNote}
        noteLabel="Reason (optional)"
        onConfirm={confirmSuspend}
        onCancel={() => {
          setConfirmOpen(false);
          setNote("");
        }}
      />
    </div>
  );
}
