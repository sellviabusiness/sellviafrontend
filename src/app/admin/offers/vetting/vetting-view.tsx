"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { syncVettingQueue, getVettingQueue, decideVetting, type VettingItemWithOffer } from "@/lib/admin/store";

/** G3 — Offer vetting queue. `syncVettingQueue` runs on mount (idempotent — see its own doc
 *  comment) so a newly-published high-commission offer shows up without a separate "scan" click,
 *  unlike G2/G6 which are explicit-trigger by design (those stand in for genuinely-async jobs). */
export function VettingView({ actorEmail }: { actorEmail: string }) {
  const [items, setItems] = useState<VettingItemWithOffer[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    await syncVettingQueue();
    setItems(await getVettingQueue("pending"));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  async function decide(id: string, decision: "approved" | "rejected") {
    setBusyId(id);
    await decideVetting(id, decision, actorEmail);
    setBusyId(null);
    refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Offer vetting</h1>
        <p className="text-sm text-muted-foreground">Offers above the high-commission threshold, held for approval before going live.</p>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<ClipboardCheck className="h-5 w-5" aria-hidden="true" />} title="Queue is empty" description="Nothing pending vetting right now." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.productName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.merchantEmail} · {item.commissionRate}% commission · flagged: {item.reason.replace(/_/g, " ")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="secondary" disabled={busyId === item.id} onClick={() => decide(item.id, "rejected")}
                    className="border-danger-border text-danger hover:bg-danger-bg">
                    Reject
                  </Button>
                  <Button type="button" variant="primary" disabled={busyId === item.id} onClick={() => decide(item.id, "approved")}>
                    Approve
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
