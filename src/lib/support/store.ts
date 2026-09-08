/**
 * MOCK DATA LAYER — Support contact.
 *
 * Stands in for:
 *   POST /support/messages  { subject, message }  → SupportMessage
 *     (real API infers `email` from the session, same "no user id param on my-own-data
 *     endpoints" note as every other mock file — see lib/merchant/store.ts's header)
 *
 * Playbook 06 F3 — logs a support submission to a local mock store, same honest-mock class as
 * every other un-backed action in this app (no real email/ticketing system exists). Not wired to
 * anything real; a real implementation needs a real backend inbox/ticketing integration.
 */
const KEY = "sellvia_support_messages";

export interface SupportMessage {
  id: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

function readAll(): SupportMessage[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SupportMessage[]) : [];
  } catch {
    return [];
  }
}

function writeAll(all: SupportMessage[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function submitSupportMessage(email: string, subject: string, message: string): SupportMessage {
  const entry: SupportMessage = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    email,
    subject: subject.trim(),
    message: message.trim(),
    createdAt: new Date().toISOString(),
  };
  writeAll([...readAll(), entry]);
  return entry;
}
