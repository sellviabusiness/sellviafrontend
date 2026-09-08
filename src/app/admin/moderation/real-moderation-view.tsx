"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { Alert } from "@/components/reference/ui/alert";
import { NoteConfirmDialog } from "@/components/admin/note-confirm-dialog";
import { listOpenFlags, clearFlag, actOnFlag } from "@/lib/admin/real-store";
import { ApiError } from "@/lib/api";
import type { RealModerationFlag } from "@/lib/admin/types";

/**
 * Real-mode counterpart to moderation-view.tsx. `listOpenFlags` returns open flags only — no
 * cleared/actioned history tabs (the mock's three-tab view has no real equivalent). No "Run
 * fraud scan" button either — nothing triggers one server-side; flags just appear as the rules
 * catch them. No entityLabel/ownerEmail — entityId is opaque (see types.ts's doc comment), shown
 * as entityType + a truncated id.
 *
 * ponytail: actOnFlag's optional suspendUserId isn't wired here — there's no endpoint to resolve
 * entityId to the user it belongs to, so the admin has nothing to type in confidently yet. Add an
 * input once a sale/application lookup exists to hand back the right user id.
 */
export function RealModerationView() {
  const [flags, setFlags] = useState<RealModerationFlag[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ flag: RealModerationFlag; action: "clear" | "act" } | null>(null);
  const [note, setNote] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    try {
      setFlags(await listOpenFlags());
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.uiMessage : "Couldn't load the moderation queue.");
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  function closePending() {
    setPending(null);
    setNote("");
  }

  async function confirmPending() {
    if (!pending) return;
    setBusyId(pending.flag.id);
    try {
      if (pending.action === "clear") await clearFlag(pending.flag.id, note || undefined);
      else await actOnFlag(pending.flag.id, note);
      closePending();
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
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Moderation queue</h1>
        <p className="text-sm text-muted-foreground">Fraud-signal flags on sales and applications, open only.</p>
      </div>

      {loadError && <Alert variant="error">{loadError}</Alert>}
      {actionError && <Alert variant="error">{actionError}</Alert>}

      {flags.length === 0 ? (
        <EmptyState icon={<ShieldAlert className="h-5 w-5" aria-hidden="true" />} title="Nothing here" description="No open flags right now." />
      ) : (
        <div className="space-y-3">
          {flags.map((flag) => (
            <Card key={flag.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-medium uppercase text-muted-foreground-2">{flag.rule.replace(/_/g, " ")}</span>
                  </div>
                  <p className="text-sm text-foreground">
                    {flag.entityType} · {flag.entityId.slice(0, 8)}…
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{flag.reason}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="secondary" disabled={busyId === flag.id} onClick={() => setPending({ flag, action: "clear" })}>
                    Clear
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busyId === flag.id}
                    className="border-danger-border text-danger hover:bg-danger-bg"
                    onClick={() => setPending({ flag, action: "act" })}
                  >
                    Act
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <NoteConfirmDialog
        open={pending !== null}
        title={pending?.action === "clear" ? "Clear this flag?" : "Act on this flag?"}
        description={
          pending?.action === "act"
            ? "Marks this flag actioned. A note is required — record what you did about it."
            : "Marks this flag reviewed with no further action."
        }
        confirmLabel={pending?.action === "clear" ? "Clear flag" : "Act"}
        destructive={pending?.action === "act"}
        note={note}
        onNoteChange={setNote}
        noteLabel={pending?.action === "act" ? "What did you do? (required)" : "Optional note"}
        confirmDisabled={busyId === pending?.flag.id || (pending?.action === "act" && note.trim().length === 0)}
        onConfirm={confirmPending}
        onCancel={closePending}
      />
    </div>
  );
}
