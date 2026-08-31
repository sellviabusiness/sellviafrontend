/**
 * MOCK DATA LAYER — Account deletion.
 *
 * Stands in for:
 *   GET  /account/deletion-status     — getDeletionState → { status, deletionScheduledAt? }
 *   POST /account/deletion/request    — requestAccountDeletion
 *   POST /account/deletion/cancel     — cancelAccountDeletion
 *
 * `getDaysRemaining` is pure client-side math over `deletionScheduledAt`, not its own endpoint.
 *
 * Playbook 06 F2 — account-level (not role-level), keyed by email: deleting the account ends
 * BOTH roles at once, so this store is shared by both /merchant/settings/delete-account and
 * /creator/settings/delete-account rather than duplicated per role, per your explicit decision.
 *
 * FLAGGED: `deletionScheduledAt` is a real, checkable countdown, but nothing actually runs the
 * deletion when it elapses — a real 14-day grace period needs a real backend/cron job to sweep
 * expired requests and delete the account's data server-side. This mock intentionally does NOT
 * fake-execute that client-side (there's no correct moment to run it — a page just being open
 * isn't a scheduler); it only stores/reads the schedule and exposes the countdown + cancel action,
 * both of which are real.
 */
const KEY = "sellvia_account_deletion";
const GRACE_PERIOD_DAYS = 14;

export type DeletionStatus = "active" | "pending_deletion";

interface DeletionState {
  status: DeletionStatus;
  deletionScheduledAt?: string;
}

function readAll(): Record<string, DeletionState> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, DeletionState>) : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, DeletionState>) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(all));
}

function emailKey(email: string) {
  return email.toLowerCase();
}

export function getDeletionState(email: string): DeletionState {
  return readAll()[emailKey(email)] ?? { status: "active" };
}

export function requestAccountDeletion(email: string): DeletionState {
  const scheduledAt = new Date(Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const state: DeletionState = { status: "pending_deletion", deletionScheduledAt: scheduledAt };
  const all = readAll();
  all[emailKey(email)] = state;
  writeAll(all);
  return state;
}

export function cancelAccountDeletion(email: string): DeletionState {
  const state: DeletionState = { status: "active" };
  const all = readAll();
  all[emailKey(email)] = state;
  writeAll(all);
  return state;
}

/** Whole days remaining, floored, never negative — 0 means "due, but still not auto-executed"
 *  (see this file's own flagged note). */
export function getDaysRemaining(deletionScheduledAt: string): number {
  const ms = new Date(deletionScheduledAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}
