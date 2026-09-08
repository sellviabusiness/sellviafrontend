"use client";

import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { StatusBadge, type StatusTone } from "@/components/reference/ui/status-badge";
import { getApplicationsForCreator } from "@/lib/merchant/store";
import { deriveCreatorId } from "@/lib/creator/identity";
import type { OwnedApplication } from "@/lib/merchant/store";
import type { ApplicationStatus } from "@/lib/merchant/types";

const STATUS_TONE: Record<ApplicationStatus, StatusTone> = { pending: "warning", approved: "success", rejected: "danger" };

/** E4 — offer, status, date. Rejection reason: real if the merchant left one (D6's optional
 *  note), "Not specified" otherwise — never invented, per Playbook 05 §21.2's resolution. */
export function ApplicationsView({ email }: { email: string }) {
  const [ready, setReady] = useState(false);
  const [applications, setApplications] = useState<OwnedApplication[]>([]);

  useEffect(() => {
    (async () => {
      const result = await getApplicationsForCreator(deriveCreatorId(email));
       
      setApplications(result);
      setReady(true);
    })();
  }, [email]);

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">My Applications</h1>
        <p className="text-sm text-muted-foreground">Every offer you&apos;ve applied to.</p>
      </div>

      {applications.length === 0 ? (
        <EmptyState icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />} title="No applications yet" description="Browse Discover and apply to an offer to get started." />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-foreground/5 text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-medium">Offer</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 font-medium">Date</th>
                <th scope="col" className="px-4 py-3 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {applications.map(({ offer, application }) => (
                <tr key={application.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{offer.productName}</td>
                  <td className="px-4 py-3"><StatusBadge tone={STATUS_TONE[application.status]}>{application.status}</StatusBadge></td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(application.appliedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {application.status === "rejected" ? (application.rejectionReason || "Not specified") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
