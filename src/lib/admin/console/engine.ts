import { parseIntent } from "./intent";
import { findTool } from "./tools";
import { logAdminAction } from "@/lib/admin/store";
import type { ConsoleTurn } from "./types";

/**
 * Playbook 07 G9 — THE SAFETY LAYER (rule 5: this file, not tools.ts, is what must never change
 * when a mock tool becomes a real one). Owns exactly three things, all independent of any tool's
 * own implementation:
 *
 * 1. Read vs. write handling — a tool's own `kind` field decides this, checked here, never
 *    re-decided per command regardless of how confident the parsed intent looks (Playbook 07
 *    §4.1: "a write tool is a write tool by definition, not by how sure the model is").
 * 2. The confirm/cancel gate on every write — nothing in tools.ts's `run()` is ever called for a
 *    write tool until `confirmPendingAction` is invoked, which only happens from a real UI
 *    button click (Playbook 07 §4.2's "distinct Confirm/Cancel control, not parsed chat text").
 * 3. Fail-closed on ambiguity — `intent.kind === "ambiguous"` or `"unknown"` never falls through
 *    to a best-guess tool call (Playbook 07 §4.3).
 *
 * Swapping intent.ts's keyword matcher for a real LLM, or any one tool's mock `run()` for a real
 * API call, touches neither this file's logic nor its exported function signatures.
 */

function newTurnId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function turn(role: ConsoleTurn["role"], status: ConsoleTurn["status"], text: string, pendingTool?: ConsoleTurn["pendingTool"]): ConsoleTurn {
  return { id: newTurnId(), role, status, text, pendingTool, at: new Date().toISOString() };
}

/**
 * Step 1: user submits free text. Returns the user's own turn plus the console's immediate
 * response — for a read, that response is already the answer (`executed`); for a write, it's the
 * confirmation prompt (`awaiting_confirmation`) with nothing executed yet; for anything unclear,
 * a `clarification_needed` turn that asks a real question back.
 */
export async function submitCommand(input: string, actorEmail: string): Promise<ConsoleTurn[]> {
  const userTurn = turn("user", "answering", input);
  const intent = parseIntent(input);

  if (intent.kind === "code_change") {
    const spec = [
      `Drafted spec (not executed — code-change requests are never run by this console):`,
      `Request: "${intent.request}"`,
      `This would need a change to the relevant lib/*/store.ts constant or business rule, reviewed`,
      `and applied by a developer through the normal build/CI process — copy this and hand it off.`,
    ].join("\n");
    return [userTurn, turn("console", "executed", spec)];
  }

  if (intent.kind === "ambiguous") {
    return [userTurn, turn("console", "clarification_needed", intent.reason)];
  }

  if (intent.kind === "unknown") {
    return [
      userTurn,
      turn(
        "console",
        "clarification_needed",
        "I couldn't confidently match that to a known action — rather than guess, tell me more specifically what you'd like (e.g. \"suspend user@email.com\", \"show flags\", \"approve vetting vet_123\").",
      ),
    ];
  }

  const tool = findTool(intent.toolName);
  if (!tool) {
    // Should never happen (intent.ts only ever names real registered tools) — fail closed anyway.
    return [userTurn, turn("console", "clarification_needed", `Unknown tool "${intent.toolName}" — refusing to guess at an action.`)];
  }

  if (tool.kind === "read") {
    const result = await tool.run(intent.args, actorEmail);
    logAdminAction({ action: tool.name, targetType: "console_read", targetId: JSON.stringify(intent.args) }, actorEmail, "ai_console");
    return [userTurn, turn("console", "executed", result.summary)];
  }

  // Write tool — propose, never execute here.
  const sideEffects = tool.describeSideEffects?.(intent.args) ?? [];
  const confirmationText = [
    `I'm about to run "${tool.name}" with ${JSON.stringify(intent.args)}.`,
    ...sideEffects.map((s) => `- ${s}`),
    "Confirm to proceed, or cancel.",
  ].join("\n");
  return [userTurn, turn("console", "awaiting_confirmation", confirmationText, { name: tool.name, args: intent.args })];
}

/** Step 2 — only reachable from a real Confirm button click on an `awaiting_confirmation` turn
 *  (never from re-parsing chat text). Executes the exact tool+args already shown, nothing else. */
export async function confirmPendingAction(pendingTool: { name: string; args: Record<string, string> }, actorEmail: string): Promise<ConsoleTurn> {
  const tool = findTool(pendingTool.name);
  if (!tool) return turn("console", "clarification_needed", `Tool "${pendingTool.name}" no longer exists — nothing was run.`);
  const result = await tool.run(pendingTool.args, actorEmail);
  // Write tools already log themselves (initiatedVia threaded through, see lib/admin/store.ts) —
  // no separate log call here, so a confirmed write is never double-logged.
  return turn("console", "executed", result.summary);
}

export function cancelPendingAction(): ConsoleTurn {
  return turn("console", "executed", "Cancelled — nothing was run.");
}
