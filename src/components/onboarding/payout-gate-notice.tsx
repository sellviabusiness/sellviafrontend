import { AlertCircle } from "lucide-react";
import { PAYOUT_INCOMPLETE_MESSAGE } from "@/lib/onboarding/payout-gate";

/**
 * Reusable banner for the C4 blocking state ("Finish payout setup to activate your links.").
 * Not wired into any Feature 4 screen in this task — Feature 4 (My Links, Discover, etc.) is out
 * of scope here — this is only the shared, ready-to-import component it will consume, so the
 * page in front of it stays untouched pending that build-out.
 */
export function PayoutGateNotice({ message = PAYOUT_INCOMPLETE_MESSAGE }: { message?: string }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-foreground"
    >
      <AlertCircle className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
