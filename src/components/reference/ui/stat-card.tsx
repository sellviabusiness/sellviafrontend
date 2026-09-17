import type { ReactNode } from "react";
import { Card } from "./card";
import { cn } from "@/lib/utils";

export type StatCardTone = "default" | "yellow" | "green" | "lavender" | "pink" | "blue";

const TONE_CLASSES: Record<StatCardTone, string> = {
  default: "",
  yellow: "bg-[var(--pastel-yellow)] text-[var(--pastel-yellow-foreground)]",
  green: "bg-[var(--pastel-green)] text-[var(--pastel-green-foreground)]",
  lavender: "bg-[var(--pastel-lavender)] text-[var(--pastel-lavender-foreground)]",
  pink: "bg-[var(--pastel-pink)] text-[var(--pastel-pink-foreground)]",
  blue: "bg-[var(--pastel-blue)] text-[var(--pastel-blue-foreground)]",
};

/** Label + large value + optional delta line. Generic — reused across every dashboard.
 *  `tone` opts a card into a pastel KPI background (matching the neo-brutalist reference's
 *  colorful stat row) — omit it for the plain white/black card every existing caller already
 *  gets unchanged. Tinted tones set `text-inherit` on the label/value: `TONE_CLASSES` already put
 *  a dark, readable foreground color on the Card itself, so label/value ride that instead of the
 *  fixed muted-foreground/foreground tokens, which would muddy against a colored background. */
export function StatCard({
  label,
  value,
  delta,
  icon,
  tone = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  /** Positive number renders green with a leading "+", negative renders red. Omit for no delta. */
  delta?: number;
  icon?: ReactNode;
  tone?: StatCardTone;
  className?: string;
}) {
  const tinted = tone !== "default";
  return (
    <Card className={cn("p-5", TONE_CLASSES[tone], className)}>
      <div className="flex items-start justify-between gap-2">
        <p className={cn("text-sm", tinted ? "text-inherit opacity-70" : "text-muted-foreground")}>{label}</p>
        {icon && <span className={tinted ? "text-inherit opacity-70" : "text-muted-foreground-2"}>{icon}</span>}
      </div>
      <p
        className={cn(
          "mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold",
          tinted ? "text-inherit" : "text-foreground",
        )}
      >
        {value}
      </p>
      {typeof delta === "number" && (
        <p className={cn("mt-1 text-xs font-medium", delta >= 0 ? "text-success" : "text-danger")}>
          {delta >= 0 ? "+" : ""}
          {delta}%
        </p>
      )}
    </Card>
  );
}
