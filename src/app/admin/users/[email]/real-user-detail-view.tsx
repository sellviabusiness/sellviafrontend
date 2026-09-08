"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserX, UserCheck } from "lucide-react";
import { Button } from "@/components/reference/ui/button";
import { StatusBadge } from "@/components/reference/ui/status-badge";
import { Alert } from "@/components/reference/ui/alert";
import { ConfirmDialog } from "@/components/reference/ui/confirm-dialog";
import { getUser, suspendUser, unsuspendUser } from "@/lib/admin/real-store";
import { ApiError } from "@/lib/api";
import type { RealUser } from "@/lib/admin/types";

/**
 * Real-mode counterpart to user-detail-view.tsx. No offer/application/sale/pending-payout
 * counts — that "ticket context" aggregate was mock-only; the real `GET /admin/users/{id}` has
 * nothing like it. Suspend/unsuspend take no request body at all — no optional note the way the
 * mock's dialog collects one.
 */
export function RealUserDetailView({ userId }: { userId: string }) {
  const [user, setUser] = useState<RealUser | null | undefined>(undefined);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function refresh() {
    try {
      setUser(await getUser(userId));
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (user === undefined) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }
  if (user === null) {
    return <p className="text-sm text-muted-foreground">User not found.</p>;
  }

  async function confirmSuspend() {
    setBusy(true);
    try {
      await suspendUser(userId);
      setConfirmOpen(false);
      await refresh();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function unsuspend() {
    setBusy(true);
    try {
      await unsuspendUser(userId);
      await refresh();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to users
      </Link>

      {actionError && <Alert variant="error">{actionError}</Alert>}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">{user.name ?? user.email}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge tone={user.isSuspended ? "danger" : "success"}>{user.isSuspended ? "Suspended" : "Active"}</StatusBadge>
            {user.isAtRisk && <StatusBadge tone="warning">At risk</StatusBadge>}
            <span className="text-xs text-muted-foreground">
              {[user.isMerchant && "merchant", user.isCreator && "creator", user.isAdmin && "admin"].filter(Boolean).join(", ") || "no role"}
            </span>
          </div>
        </div>
        {user.isSuspended ? (
          <Button type="button" variant="secondary" onClick={unsuspend} loading={busy}>
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

      <ConfirmDialog
        open={confirmOpen}
        title={`Suspend ${user.email}?`}
        description="Ends every one of this account's live/paused offers if they're a merchant. The account itself can be unsuspended later, but running offers won't automatically resume."
        confirmLabel="Suspend account"
        destructive
        onConfirm={confirmSuspend}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
