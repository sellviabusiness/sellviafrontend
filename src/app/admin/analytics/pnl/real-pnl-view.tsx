"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { Input } from "@/components/reference/ui/input";
import { Alert } from "@/components/reference/ui/alert";
import { listPnlReports, generatePnlReport, updatePnlCosts, finalizePnlReport } from "@/lib/admin/real-store";
import { formatCurrency } from "@/lib/merchant/format";
import { ApiError } from "@/lib/api";
import type { RealMonthlyPnLReport } from "@/lib/admin/types";

function centsToInput(cents: number): string {
  return (cents / 100).toString();
}

/**
 * Real-mode counterpart to pnl-view.tsx. The real backend has no auto-compute-on-read — a report
 * only exists once POST /admin/analytics/pnl/generate has run for a period, so this is
 * list-existing-reports + generate-new, rather than the mock's always-there "current month".
 * aiCostsCents exists on the report but isn't in UpdatePnlCostsInput — nothing here can edit it,
 * same "0 until real AI usage is logged" shape as the mock's aiCosts.
 */
export function RealPnlView() {
  const [reports, setReports] = useState<RealMonthlyPnLReport[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    try {
      const res = await listPnlReports();
      setReports(res);
      if (res.length > 0) setSelectedId((id) => id ?? res[0].id);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.uiMessage : "Couldn't load P&L reports.");
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  const selected = reports.find((r) => r.id === selectedId) ?? null;

  async function generate() {
    if (!periodStart || !periodEnd) return;
    setGenerating(true);
    try {
      const report = await generatePnlReport(periodStart, periodEnd);
      setReports((rs) => [report, ...rs]);
      setSelectedId(report.id);
      setPeriodStart("");
      setPeriodEnd("");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function finalize() {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await finalizePnlReport(selected.id);
      setReports((rs) => rs.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/analytics" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to analytics
      </Link>

      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Monthly P&L</h1>
        <p className="text-sm text-muted-foreground">Generate a report for a period, then fill in cost lines the backend can&apos;t see itself.</p>
      </div>

      {loadError && <Alert variant="error">{loadError}</Alert>}
      {actionError && <Alert variant="error">{actionError}</Alert>}

      <Card className="space-y-3 p-4">
        <p className="text-sm font-medium text-foreground">Generate a report</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-muted-foreground">
            Period start
            <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="mt-1" />
          </label>
          <label className="text-xs text-muted-foreground">
            Period end
            <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="mt-1" />
          </label>
          <Button type="button" variant="secondary" disabled={generating || !periodStart || !periodEnd} onClick={generate}>
            {generating ? "Generating…" : "Generate"}
          </Button>
        </div>
      </Card>

      {reports.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {reports.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedId(r.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                r.id === selectedId ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.periodStart} → {r.periodEnd}
              {r.finalized && " 🔒"}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-sm font-medium text-foreground">
              {selected.periodStart} → {selected.periodEnd}
            </h2>
            {selected.finalized ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                Finalized
              </span>
            ) : (
              <Button type="button" variant="primary" disabled={saving} onClick={finalize}>
                Finalize month
              </Button>
            )}
          </div>

          <Card className="p-0">
            <table className="w-full text-sm">
              <tbody>
                <Row label="Platform fee revenue" value={selected.platformFeeRevenueCents / 100} positive />
                <Row label="Switch processing fees" value={-selected.swichFeesCents / 100} />
                <Row label="Hosting" value={-selected.hostingCents / 100} />
                <Row label="AI / token costs" value={-selected.aiCostsCents / 100} note={selected.aiCostsCents === 0 ? "no real AI usage logged yet" : undefined} />
                <Row label="Other SaaS" value={-selected.otherSaasCents / 100} />
                <tr className="border-t border-border">
                  <td className="px-4 py-3 text-sm font-semibold text-foreground">Net</td>
                  <td className={`px-4 py-3 text-right text-sm font-semibold ${selected.netCents >= 0 ? "text-success" : "text-danger"}`}>
                    {formatCurrency(selected.netCents / 100)}
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>

          {!selected.finalized && (
            <CostEditor
              key={selected.id}
              report={selected}
              onSaved={(updated) => setReports((rs) => rs.map((r) => (r.id === updated.id ? updated : r)))}
              onError={(msg) => setActionError(msg)}
            />
          )}
        </>
      )}
    </div>
  );
}

/** Keyed by report.id in the parent so its local draft state resets per-report with no effect
 *  needed — a fresh mount for each selection instead of syncing state to a changing prop. */
function CostEditor({
  report,
  onSaved,
  onError,
}: {
  report: RealMonthlyPnLReport;
  onSaved: (updated: RealMonthlyPnLReport) => void;
  onError: (message: string) => void;
}) {
  const [swich, setSwich] = useState(centsToInput(report.swichFeesCents));
  const [hosting, setHosting] = useState(centsToInput(report.hostingCents));
  const [other, setOther] = useState(centsToInput(report.otherSaasCents));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const updated = await updatePnlCosts(report.id, {
        swichFeesCents: Math.round(Number(swich || 0) * 100),
        hostingCents: Math.round(Number(hosting || 0) * 100),
        otherSaasCents: Math.round(Number(other || 0) * 100),
      });
      onSaved(updated);
    } catch (err) {
      onError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-3 p-4">
      <p className="text-sm font-medium text-foreground">Edit cost lines</p>
      <div className="flex flex-wrap gap-3">
        <Input value={swich} onChange={(e) => setSwich(e.target.value)} placeholder="Switch fees" type="number" className="max-w-[160px]" />
        <Input value={hosting} onChange={(e) => setHosting(e.target.value)} placeholder="Hosting" type="number" className="max-w-[160px]" />
        <Input value={other} onChange={(e) => setOther(e.target.value)} placeholder="Other SaaS" type="number" className="max-w-[160px]" />
        <Button type="button" variant="secondary" disabled={saving} onClick={save}>
          Save
        </Button>
      </div>
    </Card>
  );
}

function Row({ label, value, note, positive }: { label: string; value: number; note?: string; positive?: boolean }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-3 text-sm text-foreground">
        {label}
        {note && <span className="ml-2 text-xs text-muted-foreground-2">({note})</span>}
      </td>
      <td className={`px-4 py-3 text-right text-sm ${positive ? "text-success" : "text-muted-foreground"}`}>{formatCurrency(value)}</td>
    </tr>
  );
}
