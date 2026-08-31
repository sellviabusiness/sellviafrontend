"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, ScanSearch } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { StatusBadge, type StatusTone } from "@/components/reference/ui/status-badge";
import { NoteConfirmDialog } from "@/components/admin/note-confirm-dialog";
import { getFlags, runFraudScan, clearFlag, actionFlag } from "@/lib/admin/store";
import type { ModerationFlag, FlagStatus } from "@/lib/admin/types";

const TABS: { value: FlagStatus; label: string }[] = [
  { value: "unreviewed", label: "Unreviewed" },
  { value: "cleared", label: "Cleared" },
  { value: "actioned", label: "Actioned" },
];

const TONE: Record<FlagStatus, StatusTone> = { unreviewed: "warning", cleared: "success", actioned: "danger" };

export function ModerationView({ actorEmail }: { actorEmail: string }) {
  const [tab, setTab] = useState<FlagStatus>("unreviewed");
  const [flags, setFlags] = useState<ModerationFlag[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [pending, setPending] = useState<{ flag: ModerationFlag; action: "clear" | "action" } | null>(null);
  const [note, setNote] = useState("");

  function refresh() {
    setFlags(getFlags(tab));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function runScan() {
    setScanning(true);
    const { flagsCreated } = await runFraudScan(actorEmail);
    setScanMsg(flagsCreated > 0 ? `Scan complete — ${flagsCreated} new flag(s) created.` : "Scan complete — nothing new to flag.");
    setScanning(false);
    refresh();
  }

  function closePending() {
    setPending(null);
    setNote("");
  }

  async function confirmPending() {
    if (!pending) return;
    if (pending.action === "clear") clearFlag(pending.flag.id, actorEmail, note || undefined);
    else await actionFlag(pending.flag.id, actorEmail, note || undefined);
    closePending();
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Moderation queue</h1>
          <p className="text-sm text-muted-foreground">Fraud-signal flags on offers, sales, and accounts.</p>
        </div>
        <Button type="button" variant="secondary" onClick={runScan} disabled={scanning}>
          <ScanSearch className="h-4 w-4" aria-hidden="true" />
          {scanning ? "Scanning…" : "Run fraud scan"}
        </Button>
      </div>

      {scanMsg && <p className="text-sm text-muted-foreground">{scanMsg}</p>}

      <div className="flex gap-2 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t.value ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {flags.length === 0 ? (
        <EmptyState icon={<ShieldAlert className="h-5 w-5" aria-hidden="true" />} title="Nothing here" description="No flags in this state." />
      ) : (
        <div className="space-y-3">
          {flags.map((flag) => (
            <Card key={flag.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <StatusBadge tone={TONE[flag.status]}>{flag.status}</StatusBadge>
                    <span className="text-xs text-muted-foreground-2">{flag.rule.replace(/_/g, " ")}</span>
                  </div>
                  <p className="text-sm text-foreground">{flag.entityLabel}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Owner: {flag.ownerEmail}</p>
                  {flag.reviewNote && <p className="mt-1 text-xs text-muted-foreground">Note: {flag.reviewNote}</p>}
                </div>
                {flag.status === "unreviewed" && (
                  <div className="flex shrink-0 gap-2">
                    <Button type="button" variant="secondary" onClick={() => setPending({ flag, action: "clear" })}>
                      Clear
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="border-danger-border text-danger hover:bg-danger-bg"
                      onClick={() => setPending({ flag, action: "action" })}
                    >
                      Act
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <NoteConfirmDialog
        open={pending !== null}
        title={pending?.action === "clear" ? "Clear this flag?" : "Act on this flag?"}
        description={
          pending?.action === "action"
            ? "For an offer-type flag, this ends every live/paused offer for the owning merchant. This can't be undone from here."
            : "Marks this flag reviewed with no further action."
        }
        confirmLabel={pending?.action === "clear" ? "Clear flag" : "Act"}
        destructive={pending?.action === "action"}
        note={note}
        onNoteChange={setNote}
        onConfirm={confirmPending}
        onCancel={closePending}
      />
    </div>
  );
}
