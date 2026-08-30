import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "danger" | "neutral";

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success/10 text-success border-success/30",
  warning: "bg-accent/10 text-accent border-accent/30",
  danger: "bg-danger/10 text-danger border-danger-border",
  neutral: "bg-foreground/5 text-muted-foreground border-border",
};

/** Color-coded pill that always carries a text label — color is never the only signal
 *  (Playbook 03 §9). Generic, reused across Campaigns/Applications/Sales/Payouts. */
export function StatusBadge({ tone, children }: { tone: StatusTone; children: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        TONE_CLASSES[tone],
      )}
    >
      {children}
    </span>
  );
}
