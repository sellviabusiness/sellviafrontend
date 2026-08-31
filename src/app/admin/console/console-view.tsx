"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal, Send, ShieldAlert } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { Input } from "@/components/reference/ui/input";
import { StatusBadge, type StatusTone } from "@/components/reference/ui/status-badge";
import { submitCommand, confirmPendingAction, cancelPendingAction } from "@/lib/admin/console/engine";
import type { ConsoleTurn, ConsoleTurnStatus } from "@/lib/admin/console/types";

const STATUS_TONE: Record<ConsoleTurnStatus, StatusTone> = {
  answering: "neutral",
  executed: "success",
  awaiting_confirmation: "warning",
  clarification_needed: "danger",
};

/**
 * G9 — Founder AI Command Console, the most sensitive screen in the app (Playbook 07 §4). Every
 * write action stops here for a REAL confirm/cancel button click before `engine.ts` runs
 * anything — nothing in this component parses "yes"/"confirm" out of typed text as an approval;
 * the input box is disabled while a confirmation is pending specifically so the only way to
 * proceed is the dedicated Confirm/Cancel control below. Ambiguous or unrecognized input always
 * comes back as a `clarification_needed` turn (engine.ts fails closed), never a best-guess action.
 */
export function ConsoleView({ actorEmail }: { actorEmail: string }) {
  const [turns, setTurns] = useState<ConsoleTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const lastTurn = turns[turns.length - 1];
  const awaitingConfirmation = lastTurn?.status === "awaiting_confirmation";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  async function send() {
    const text = input.trim();
    if (!text || busy || awaitingConfirmation) return;
    setInput("");
    setBusy(true);
    const newTurns = await submitCommand(text, actorEmail);
    setTurns((t) => [...t, ...newTurns]);
    setBusy(false);
  }

  async function confirm() {
    if (!lastTurn?.pendingTool) return;
    setBusy(true);
    const result = await confirmPendingAction(lastTurn.pendingTool, actorEmail);
    setTurns((t) => [...t, result]);
    setBusy(false);
  }

  function cancel() {
    setTurns((t) => [...t, cancelPendingAction()]);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
      <div>
        <h1 className="flex items-center gap-2 font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">
          <Terminal className="h-5 w-5" aria-hidden="true" />
          Founder AI Console
        </h1>
        <p className="text-sm text-muted-foreground">
          Every write action requires explicit confirmation below — nothing is ever executed from typed text alone. Code-change requests are
          drafted, never run.
        </p>
      </div>

      <Card className="flex-1 space-y-4 overflow-y-auto p-4">
        {turns.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Try: &quot;show marketplace health&quot;, &quot;show flags&quot;, &quot;suspend someone@example.com&quot;, &quot;approve vetting
            vet_xxxxx&quot;.
          </p>
        )}
        {turns.map((turn) => (
          <div key={turn.id} className={turn.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[85%] rounded-[var(--radius-md)] border p-3 ${turn.role === "user" ? "border-accent/30 bg-accent/10" : "border-border bg-foreground/5"}`}>
              {turn.role === "console" && (
                <div className="mb-1">
                  <StatusBadge tone={STATUS_TONE[turn.status]}>{turn.status.replace(/_/g, " ")}</StatusBadge>
                </div>
              )}
              <p className="whitespace-pre-wrap text-sm text-foreground">{turn.text}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </Card>

      {awaitingConfirmation && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-accent/30 bg-accent/5 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ShieldAlert className="h-4 w-4 text-accent" aria-hidden="true" />
            Confirmation required before this runs.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={cancel} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={confirm} disabled={busy}>
              Confirm
            </Button>
          </div>
        </Card>
      )}

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={awaitingConfirmation ? "Resolve the pending confirmation above first" : "Ask a question or request an action"}
          disabled={busy || awaitingConfirmation}
        />
        <Button type="button" variant="primary" onClick={send} disabled={busy || awaitingConfirmation || !input.trim()}>
          <Send className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
