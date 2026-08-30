import type { ReactNode } from "react";
import { Card } from "./card";
import { cn } from "@/lib/utils";

/** Icon + headline + one-line body + CTA. Generic, reused across every first-run screen
 *  (Overview, Campaigns, Applications, Sales — Playbook 03 §3) and later the Creator dashboard. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col items-center gap-3 py-12 text-center", className)}>
      {icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
          {icon}
        </span>
      )}
      <div className="space-y-1">
        <h3 className="font-[family-name:var(--font-heading)] text-base font-semibold text-foreground">
          {title}
        </h3>
        {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </Card>
  );
}
