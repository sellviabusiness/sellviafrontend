"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Cpu } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { getAiUsageEvents } from "@/lib/admin/store";
import type { AiUsageEvent } from "@/lib/admin/types";
import { formatRelativeTime } from "@/lib/merchant/format";

/** G10 AI/token usage — Analytics/AI Token Usage Tracking's real requirement: logged per-call, not
 *  aggregated. This app's own AI-touching features (matching, screening, copy-assist) call a real,
 *  currently-unreachable backend and have logged zero real events yet — an honest empty state, not
 *  a fabricated usage history. */
export function AiUsageView() {
  const [events, setEvents] = useState<AiUsageEvent[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEvents(getAiUsageEvents());
  }, []);

  return (
    <div className="space-y-6">
      <Link href="/admin/analytics" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to analytics
      </Link>

      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">AI / token usage</h1>
        <p className="text-sm text-muted-foreground">Per-call usage, not aggregated — each row is one real AI feature invocation.</p>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={<Cpu className="h-5 w-5" aria-hidden="true" />}
          title="No usage logged yet"
          description="This app's AI features call a real backend that isn't reachable yet — nothing has been logged, so nothing is shown here."
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Feature</th>
                <th className="px-4 py-3 font-medium">Tokens in / out</th>
                <th className="px-4 py-3 font-medium">Cost</th>
                <th className="px-4 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-foreground">{e.feature.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {e.tokensIn} / {e.tokensOut}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">${(e.costCents / 100).toFixed(4)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatRelativeTime(e.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
