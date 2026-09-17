"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserX, UserCheck } from "lucide-react";
import { Button } from "@/components/reference/ui/button";
import { Card } from "@/components/reference/ui/card";
import { StatCard } from "@/components/reference/ui/stat-card";
import { StatusBadge } from "@/components/reference/ui/status-badge";
import { Alert } from "@/components/reference/ui/alert";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { SkeletonStatGrid } from "@/components/reference/ui/skeleton";
import { ConfirmDialog } from "@/components/reference/ui/confirm-dialog";
import { getUser, getUserStats, suspendUser, unsuspendUser } from "@/lib/admin/real-store";
import { formatCurrency, formatPercent } from "@/lib/merchant/format";
import { ApiError } from "@/lib/api";
import type { RealUser, AdminUserStats } from "@/lib/admin/types";

/**
 * Real-mode counterpart to user-detail-view.tsx. No offer/application/sale/pending-payout
 * counts — that "ticket context" aggregate was mock-only; the real `GET /admin/users/{id}` has
 * nothing like it. Suspend/unsuspend take no request body at all — no optional note the way the
 * mock's dialog collects one.
 *
 * BUG FOUND LIVE — nothing here (or in the mock's own UserDetailView) stopped an admin from
 * suspending their OWN account: clicking through Users → self → Suspend actually worked, and the
 * very next admin request (backend correctly refusing a suspended account) locked them out of
 * admin entirely — no accounts list, no way back in through the UI. Root cause fixed one layer up
 * (listUsers() in real-store.ts no longer returns admin accounts at all — this screen is for
 * moderating merchants/creators, not managing other admins) — `user.isAdmin` guarded here too,
 * defense in depth for anyone reaching a detail URL directly (a known admin id, not just their own).
 * Frontend-only — worth asking backend to reject suspending an admin account server-side too,
 * since this can't stop a direct API call.
 */
export function RealUserDetailView({ userId, currentUserEmail }: { userId: string; currentUserEmail: string }) {
  const [user, setUser] = useState<RealUser | null | undefined>(undefined);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // "no-profile" (404 NO_PROFILE) is a real, expected state — signed up, never picked a role —
  // not an error; kept distinct from "error" (404 NOT_FOUND, or anything else) so the empty
  // state doesn't read like something's broken.
  const [statsState, setStatsState] = useState<"loading" | "ready" | "no-profile" | "error">("loading");
  const [stats, setStats] = useState<AdminUserStats | null>(null);
  const [statsErrorMessage, setStatsErrorMessage] = useState<string | null>(null);

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
    (async () => {
      try {
        const result = await getUserStats(userId);
        setStats(result);
        setStatsState("ready");
      } catch (err) {
        if (err instanceof ApiError && err.code === "NO_PROFILE") {
          setStatsState("no-profile");
        } else {
          setStatsErrorMessage(err instanceof ApiError ? err.uiMessage : "Couldn't load account stats.");
          setStatsState("error");
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (user === undefined) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }
  if (user === null) {
    return <p className="text-sm text-muted-foreground">User not found.</p>;
  }

  const isSelf = user.email.toLowerCase() === currentUserEmail.toLowerCase();
  const isProtected = isSelf || user.isAdmin;

  async function confirmSuspend() {
    if (isProtected) return; // button is hidden for this case, but never trust that alone
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
        {isProtected ? (
          <span className="text-xs text-muted-foreground">
            {isSelf ? "This is your own account — can't suspend yourself here." : "Admin accounts aren't managed here."}
          </span>
        ) : user.isSuspended ? (
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

      {statsState === "loading" && <SkeletonStatGrid count={6} />}
      {statsState === "no-profile" && (
        <EmptyState title="No merchant or creator profile yet" description="This account signed up but hasn't picked a role." />
      )}
      {statsState === "error" && <Alert variant="error">{statsErrorMessage}</Alert>}
      {statsState === "ready" && stats && <StatsSection stats={stats} />}
    </div>
  );
}

function StatsSection({ stats }: { stats: AdminUserStats }) {
  if (stats.role === "merchant" && stats.merchantDashboard) {
    const d = stats.merchantDashboard;
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Offers posted" value={d.offersTotal} />
        <StatCard label="Live" value={d.offersLive} />
        <StatCard label="Clicks" value={d.clicksTotal} />
        <StatCard label="Sales" value={d.salesAcceptedTotal} />
        <StatCard label="Conversion" value={d.conversionRate === null ? "Not enough data yet" : formatPercent(d.conversionRate)} />
        <StatCard label="Amount billed" value={formatCurrency(d.amountBilledCents / 100)} />
      </div>
    );
  }

  if (stats.role === "creator" && stats.creatorDashboard) {
    const d = stats.creatorDashboard;
    const breakdown = stats.creatorEarningsBreakdown;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard label="Links" value={d.linksTotal} />
          <StatCard label="Clicks" value={d.clicksTotal} />
          <StatCard label="Sales attributed" value={d.salesAttributedTotal} />
          <StatCard label="Wallet balance" value={formatCurrency(d.walletBalanceCents / 100)} />
          <StatCard label="Lifetime paid out" value={formatCurrency(d.lifetimePaidOutCents / 100)} />
          <StatCard
            label="Payout this period"
            value={<StatusBadge tone={d.hasPayoutThisPeriod ? "success" : "neutral"}>{d.hasPayoutThisPeriod ? "Yes" : "No"}</StatusBadge>}
          />
        </div>
        {breakdown && (
          <Card className="grid grid-cols-3 gap-4 p-5">
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(breakdown.pendingCents / 100)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Billed</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(breakdown.billedCents / 100)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(breakdown.paidCents / 100)}</p>
            </div>
          </Card>
        )}
      </div>
    );
  }

  return null;
}
