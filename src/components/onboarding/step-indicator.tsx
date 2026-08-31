import { getStepSequence, STEP_LABEL } from "@/lib/onboarding/steps";
import { cn } from "@/lib/utils";
import type { StepId } from "@/lib/onboarding/types";

/** Plain progress bar + "Step X of Y" text — no decoration beyond that. "complete" and
 *  "transition" are both excluded from the count: complete is the destination, not a step, and
 *  transition is a static celebration screen with no fields of its own. */
export function StepIndicator({ current, roles }: { current: StepId; roles: string[] }) {
  const sequence: StepId[] = getStepSequence(roles).filter((s) => s !== "complete" && s !== "transition");
  const index = sequence.indexOf(current);
  if (index === -1) return null; // "complete" and "transition" show no numbered indicator

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground-2">
        Step {index + 1} of {sequence.length} — {STEP_LABEL[current]}
      </p>
      <div className="mt-2 flex gap-1" aria-hidden="true">
        {sequence.map((step, i) => (
          <span key={step} className={cn("h-1 flex-1 rounded-full", i <= index ? "bg-accent" : "bg-border")} />
        ))}
      </div>
    </div>
  );
}
