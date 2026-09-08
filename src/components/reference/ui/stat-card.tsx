import type { ReactNode } from "react";
import { Card } from "./card";
import { cn } from "@/lib/utils";

/** Label + large value + optional delta line. Generic — reused across Overview and (later) the
 *  Creator dashboard, per Playbook 03 §3. No shadows/gradients, matches the existing Card. */
export function StatCard({
  label,
  value,
  delta,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  /** Positive number renders green with a leading "+", negative renders red. Omit for no delta. */
  delta?: number;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {icon && <span className="text-muted-foreground-2">{icon}</span>}
      </div>
      <p className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-foreground">
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
