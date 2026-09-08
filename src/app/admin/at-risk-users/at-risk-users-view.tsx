"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { StatusBadge } from "@/components/reference/ui/status-badge";
import { getAtRiskUsers, type AtRiskUser } from "@/lib/admin/store";
import { CHURN_AT_RISK_HOURS } from "@/lib/admin/constants";

/** G8 — read-only by design (Playbook 07 §3.8: no nudge-send/core action exists in this build,
 *  Analytics/Activation only specifies the signal, not an automated remediation). Real version is
 *  an hourly cron's output; this computes the same query on read (see store.ts doc comment). */
export function AtRiskUsersView() {
  const [users, setUsers] = useState<AtRiskUser[]>([]);

  useEffect(() => {
    (async () => {
      const result = await getAtRiskUsers();
       
      setUsers(result);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">At-risk new users</h1>
        <p className="text-sm text-muted-foreground">
          Signed up ≥{CHURN_AT_RISK_HOURS}h ago with no core action yet (merchant: publish an offer; creator: submit an application). Read-only — no
          nudge/remediation action exists in this build.
        </p>
      </div>

      {users.length === 0 ? (
        <EmptyState icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />} title="Nobody at risk" description="No accounts past the threshold right now." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Hours since signup</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={`${u.email}-${u.role}`} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone="neutral">{u.role}</StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.hoursSinceSignup}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
