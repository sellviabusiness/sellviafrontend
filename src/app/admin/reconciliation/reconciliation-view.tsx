"use client";

import { useEffect, useState } from "react";
import { Scale, ScanSearch } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { NoteConfirmDialog } from "@/components/admin/note-confirm-dialog";
import { getReconciliationMismatches, runReconciliationScan, resolveMismatch } from "@/lib/admin/store";
import type { ReconciliationMismatch } from "@/lib/admin/types";

/** G6 — illustrative-only scan (see lib/admin/store.ts's runReconciliationScan doc comment: no
 *  real Switch transaction feed exists yet to diff against). Explicit-trigger, same as G2's fraud
 *  scan, since a real reconciliation run is genuinely async/scheduled, not something to fake as
 *  automatic here. */
export function ReconciliationView({ actorEmail }: { actorEmail: string }) {
  const [mismatches, setMismatches] = useState<ReconciliationMismatch[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [pending, setPending] = useState<ReconciliationMismatch | null>(null);
  const [note, setNote] = useState("");

  function refresh() {
    setMismatches(getReconciliationMismatches("open"));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  async function runScan() {
    setScanning(true);
    const { mismatchesCreated } = await runReconciliationScan(actorEmail);
    setScanMsg(mismatchesCreated > 0 ? `Scan complete — ${mismatchesCreated} new mismatch(es) found.` : "Scan complete — nothing new found.");
    setScanning(false);
    refresh();
  }

  function confirmResolve() {
    if (!pending || !note.trim()) return;
    resolveMismatch(pending.id, note.trim(), actorEmail);
    setPending(null);
    setNote("");
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Reconciliation review</h1>
          <p className="text-sm text-muted-foreground">Open mismatches between recorded sales and Switch&apos;s records — illustrative until a real Switch feed exists.</p>
        </div>
        <Button type="button" variant="secondary" onClick={runScan} disabled={scanning}>
          <ScanSearch className="h-4 w-4" aria-hidden="true" />
          {scanning ? "Scanning…" : "Run scan"}
        </Button>
      </div>

      {scanMsg && <p className="text-sm text-muted-foreground">{scanMsg}</p>}

      {mismatches.length === 0 ? (
        <EmptyState icon={<Scale className="h-5 w-5" aria-hidden="true" />} title="Nothing open" description="No open mismatches." />
      ) : (
        <div className="space-y-3">
          {mismatches.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground-2">{m.kind.replace(/_/g, " ")}</p>
                  <p className="mt-1 text-sm text-foreground">{m.detail}</p>
                </div>
                <Button type="button" variant="secondary" className="shrink-0" onClick={() => setPending(m)}>
                  Resolve
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <NoteConfirmDialog
        open={pending !== null}
        title="Resolve this mismatch?"
        description="A resolution note is required — this is the record of what was actually checked/fixed."
        confirmLabel="Resolve"
        note={note}
        onNoteChange={setNote}
        noteLabel="Resolution note (required)"
        confirmDisabled={!note.trim()}
        onConfirm={confirmResolve}
        onCancel={() => {
          setPending(null);
          setNote("");
        }}
      />
    </div>
  );
}
