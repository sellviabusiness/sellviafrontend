/**
 * Playbook 07 G9 — Founder AI Command Console. Types shared by tools.ts (what a tool IS),
 * intent.ts (the mock "NLP" stand-in), and engine.ts (the safety layer that sits above both —
 * see engine.ts's own header for why this split is the whole point of rule 5).
 */

export type ToolKind = "read" | "write";

export interface ToolResult {
  /** Human-readable answer/confirmation text, shown directly in the transcript. */
  summary: string;
  data?: unknown;
}

/**
 * One tool = one already-existing, already-permission-checked admin operation — never raw data
 * access (Operations/Founder AI Command Console's own architecture rule). `run` is the ONLY part
 * of this that changes when a mock tool is swapped for a real backend call later; `kind` and
 * `describeSideEffects` are what the safety layer (engine.ts) reads, and neither depends on how
 * `run` is implemented.
 */
export interface ConsoleTool {
  name: string;
  kind: ToolKind;
  /** Shown when listing "what can you do" and in clarification prompts. */
  description: string;
  /**
   * Write tools only — computed from the resolved args BEFORE execution, shown verbatim in the
   * confirmation prompt (Playbook 07 §4.2: "states exactly what it's about to do... including
   * side effects"). Absent/empty on a read tool (nothing to confirm).
   */
  describeSideEffects?: (args: Record<string, string>) => string[];
  run: (args: Record<string, string>, actorEmail: string) => Promise<ToolResult>;
}

export type ConsoleTurnStatus = "answering" | "awaiting_confirmation" | "executed" | "clarification_needed";

export interface ConsoleTurn {
  id: string;
  role: "user" | "console";
  status: ConsoleTurnStatus;
  text: string;
  /** Set only on an awaiting_confirmation turn — what Confirm actually runs. */
  pendingTool?: { name: string; args: Record<string, string> };
  at: string;
}
