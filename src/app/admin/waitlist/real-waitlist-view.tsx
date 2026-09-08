"use client";

import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { StatusBadge } from "@/components/reference/ui/status-badge";
import { Alert } from "@/components/reference/ui/alert";
import { listWaitlist, inviteWaitlistEntry } from "@/lib/admin/real-store";
import { formatRelativeTime } from "@/lib/merchant/format";
import { ApiError } from "@/lib/api";
import type { RealWaitlistEntry } from "@/lib/admin/types";

/**
 * Net-new — no mock precedent (Playbook 08 dropped the public marketing site that used to feed
 * this, but the real backend keeps its own `/admin/waitlist` queue regardless). No public
 * join-form exists in this app yet either, so entries only ever land here via some other path
 * (direct backend insert, a future public form) — this view is read+invite only.
 */
export function RealWaitlistView() {
  const [entries, setEntries] = useState<RealWaitlistEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    try {
      setEntries(await listWaitlist());
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.uiMessage : "Couldn't load the waitlist.");
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  async function invite(entry: RealWaitlistEntry) {
    setBusyId(entry.id);
    try {
      await inviteWaitlistEntry(entry.id);
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
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Waitlist</h1>
        <p className="text-sm text-muted-foreground">Everyone who signed up ahead of an invite.</p>
      </div>

      {loadError && <Alert variant="error">{loadError}</Alert>}
      {actionError && <Alert variant="error">{actionError}</Alert>}

      {entries.length === 0 ? (
        <EmptyState icon={<UserPlus className="h-5 w-5" aria-hidden="true" />} title="Nobody waiting" description="The waitlist is empty." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-foreground">{entry.email}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={entry.status === "invited" ? "success" : "neutral"}>{entry.status}</StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatRelativeTime(entry.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {entry.status === "waiting" && (
                      <Button type="button" variant="secondary" disabled={busyId === entry.id} onClick={() => invite(entry)}>
                        Invite
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
