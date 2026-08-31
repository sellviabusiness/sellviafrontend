/**
 * Playbook 07 G9 — the ONE genuinely-mock piece of the console: a deterministic keyword matcher
 * standing in for a real LLM's tool-calling. Swapping this for a real LLM later means replacing
 * `parseIntent`'s body with an actual model call that returns the same `ParsedIntent` shape —
 * engine.ts (the safety layer) never changes, since it only ever consumes this return type, not
 * how it was produced. Deliberately small — recognizes a handful of example commands to
 * demonstrate the real read/write/ambiguous/code-change split end to end, not a real NLU.
 */

export type ParsedIntent =
  | { kind: "tool"; toolName: string; args: Record<string, string> }
  | { kind: "code_change"; request: string }
  | { kind: "ambiguous"; reason: string }
  | { kind: "unknown" };

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/i;
const ID_RE = /\b([a-z]+_[a-z0-9-]+)\b/i;

function extractEmail(input: string): string | undefined {
  return input.match(EMAIL_RE)?.[0];
}
function extractId(input: string): string | undefined {
  return input.match(ID_RE)?.[0];
}

export function parseIntent(input: string): ParsedIntent {
  const text = input.trim().toLowerCase();
  if (!text) return { kind: "unknown" };

  // Code-change requests — a hard third category, never executed (Playbook 07 §4.4).
  if (/\b(change|make)\b.*\b(threshold|code|feature|behavior|deploy)\b/.test(text) || /instead of \$?\d/.test(text)) {
    return { kind: "code_change", request: input.trim() };
  }

  // Reads
  if (/marketplace health|active (merchants|creators)|liquidity/.test(text)) return { kind: "tool", toolName: "get_marketplace_health", args: {} };
  if (/(pending )?vetting queue|offers? pending vetting/.test(text)) return { kind: "tool", toolName: "get_vetting_queue", args: {} };
  if (/\bflags?\b/.test(text) && /list|show|unreviewed|see/.test(text)) return { kind: "tool", toolName: "get_flags", args: {} };
  if (/p&?l|profit|revenue/.test(text)) return { kind: "tool", toolName: "get_pnl", args: {} };
  if (/(look ?up|show|find|get) (this )?user|who is/.test(text)) {
    const email = extractEmail(input);
    if (!email) return { kind: "ambiguous", reason: "Which user? I need an email address." };
    return { kind: "tool", toolName: "get_user", args: { email } };
  }

  // Writes
  if (/\bsuspend\b/.test(text)) {
    const email = extractEmail(input);
    if (!email) return { kind: "ambiguous", reason: "Suspend which account? I need an email address." };
    return { kind: "tool", toolName: "suspend_user", args: { email } };
  }
  if (/\bclear\b.*\bflag\b/.test(text)) {
    const id = extractId(input);
    if (!id) return { kind: "ambiguous", reason: "Clear which flag? I need its id (e.g. flag_xxxxx)." };
    return { kind: "tool", toolName: "clear_flag", args: { flagId: id } };
  }
  if (/\bapprove\b.*(vetting|offer)/.test(text)) {
    const id = extractId(input);
    if (!id) return { kind: "ambiguous", reason: "Approve which vetting item? I need its id (e.g. vet_xxxxx)." };
    return { kind: "tool", toolName: "approve_offer_vetting", args: { vettingId: id } };
  }
  if (/\breject\b.*(vetting|offer)/.test(text)) {
    const id = extractId(input);
    if (!id) return { kind: "ambiguous", reason: "Reject which vetting item? I need its id (e.g. vet_xxxxx)." };
    return { kind: "tool", toolName: "reject_offer_vetting", args: { vettingId: id } };
  }
  if (/\brefund\b/.test(text)) {
    const id = extractId(input);
    if (!id) return { kind: "ambiguous", reason: "Refund which sale? I need its id (e.g. sale_xxxxx)." };
    return { kind: "tool", toolName: "trigger_refund", args: { saleId: id } };
  }

  return { kind: "unknown" };
}
