"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { Alert } from "@/components/reference/ui/alert";
import { getOffers, getApplications, getSales } from "@/lib/merchant/store";
import { getApplicationsForCreator, getSalesForCreator } from "@/lib/merchant/store";
import { deriveCreatorId } from "@/lib/creator/identity";
import { getDeletionState, requestAccountDeletion, cancelAccountDeletion, getDaysRemaining } from "@/lib/account/deletion";

/**
 * Playbook 06 F2 — shared by both /merchant/settings/delete-account and
 * /creator/settings/delete-account (per your decision: an entry point in each role's own
 * Settings, since deleting the account ends both roles, not just one). Reads THIS account's real
 * current data across whichever roles the session holds, regardless of which settings page it
 * was opened from — deletion is account-wide.
 */
export function DeleteAccountView({ email, roles }: { email: string; roles: string[] }) {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<"active" | "pending_deletion">("active");
  const [scheduledAt, setScheduledAt] = useState<string | undefined>();
  const [summary, setSummary] = useState<{ label: string; count: number }[]>([]);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const state = getDeletionState(email);
    setStatus(state.status);
    setScheduledAt(state.deletionScheduledAt);

    const items: { label: string; count: number }[] = [];
    if (roles.includes("merchant")) {
      const [offers, applications, sales] = await Promise.all([getOffers(email), getApplications(email), getSales(email)]);
      items.push(
        { label: "live offers", count: offers.filter((o) => o.status === "live").length },
        { label: "applications received", count: applications.length },
        { label: "recorded sales", count: sales.length },
      );
    }
    if (roles.includes("creator")) {
      const creatorId = deriveCreatorId(email);
      const [apps, creatorSales] = await Promise.all([getApplicationsForCreator(creatorId), getSalesForCreator(creatorId)]);
      items.push(
        { label: "applications you've submitted", count: apps.length },
        { label: "active tracking links", count: apps.filter((o) => o.application.status === "approved").length },
        { label: "recorded sales you earned commission on", count: creatorSales.length },
      );
    }
    setSummary(items);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, roles.join(",")]);

  if (!ready) {
    return <div className="h-48 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }

  function handleRequestDeletion() {
    setBusy(true);
    requestAccountDeletion(email);
    setBusy(false);
    refresh();
  }

  function handleCancel() {
    setBusy(true);
    cancelAccountDeletion(email);
    setBusy(false);
    refresh();
  }

  if (status === "pending_deletion" && scheduledAt) {
    const daysLeft = getDaysRemaining(scheduledAt);
    return (
      <Card className="space-y-4 p-6">
        <Alert variant="error">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            Account deletion scheduled — {daysLeft} day{daysLeft === 1 ? "" : "s"} remaining.
          </span>
        </Alert>
        <p className="text-sm text-muted-foreground">
          Your account and access to both roles will be permanently deleted on{" "}
          {new Date(scheduledAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}. You can cancel any time before then.
        </p>
        <Button variant="secondary" className="w-full" onClick={handleCancel} loading={busy}>
          Cancel account deletion
        </Button>
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <Trash2 className="h-5 w-5 text-danger" aria-hidden="true" />
        <h2 className="font-[family-name:var(--font-heading)] text-base font-semibold text-foreground">Delete account</h2>
      </div>
      <p className="text-sm text-muted-foreground">This will permanently delete:</p>
      <ul className="space-y-1 text-sm text-foreground">
        {summary.map((item) => (
          <li key={item.label}>
            {item.count} {item.label}
          </li>
        ))}
        <li>your login, all role access, and profile/payout details</li>
      </ul>
      <p className="text-xs text-muted-foreground-2">
        Deletion doesn&apos;t happen immediately — you&apos;ll have 14 days to cancel before it&apos;s final.
      </p>
      <Button variant="secondary" className="w-full text-danger" onClick={handleRequestDeletion} loading={busy}>
        Request account deletion
      </Button>
    </Card>
  );
}
