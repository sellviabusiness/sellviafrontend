import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "danger" | "neutral";

/* 2026-09-10 neo-brutalist pass: pastel chip backgrounds (not the old /10-opacity tints) plus a
 * real 2px border — danger stays semantic red rather than going pastel, since a badge that means
 * "this failed" shouldn't get softer just to fit the accent palette. */
const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-[var(--pastel-green)] text-[var(--pastel-green-foreground)] border-border",
  warning: "bg-[var(--pastel-yellow)] text-[var(--pastel-yellow-foreground)] border-border",
  danger: "bg-danger/10 text-danger border-danger-border",
  neutral: "bg-foreground/5 text-muted-foreground border-border",
};

/** Color-coded chip that always carries a text label — color is never the only signal
 *  (Playbook 03 §9). Generic, reused across Campaigns/Applications/Sales/Payouts. Square corners
 *  (not the old rounded-full pill) — full-sharp pass, no rounding anywhere. */
export function StatusBadge({ tone, children }: { tone: StatusTone; children: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-sm)] border-2 px-2.5 py-0.5 text-xs font-medium capitalize",
        TONE_CLASSES[tone],
      )}
    >
      {children}
    </span>
  );
}
