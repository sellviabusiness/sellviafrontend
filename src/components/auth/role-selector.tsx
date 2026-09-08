import { cn } from "@/lib/utils";

/**
 * Product decision (explicit, overrides the earlier "dual-role account" design this repo's
 * comments elsewhere still describe): an account is either a Merchant or a Creator, never both
 * — exactly-one-of, not a set. Real radio inputs (not styled checkboxes) so exclusivity is
 * enforced by the browser itself, not reimplemented in JS. `selected`/`onChange` still use a
 * `string[]` (0 or 1 entries) rather than a plain `string | null`, purely so every existing
 * caller/consumer up the chain (OnboardingRecord.roles, AppSession.roles, the mock provider,
 * updateClerkRoles) keeps working unchanged — this component is the one place that actually
 * enforces the cardinality now, and the only place a role is ever chosen — onboarding no longer
 * has its own role-select step, it just reads this back off the session.
 */
export const ROLE_TRAIT_FIELD_NAME = "traits.roles";

const OPTIONS = [
  { value: "merchant", label: "Merchant" },
  { value: "creator", label: "Creator" },
] as const;

export function RoleSelector({
  selected,
  onChange,
  disabled,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-foreground">
        I want to join as <span aria-hidden="true" className="text-danger">*</span>
      </legend>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((opt) => {
          const checked = selected[0] === opt.value;
          return (
            <label
              key={opt.value}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] border px-3.5 py-2.5 text-sm font-medium text-foreground transition-colors",
                checked
                  ? "border-accent"
                  : "border-border hover:border-border-hover",
                disabled && "cursor-not-allowed opacity-50",
              )}
            >
              <input
                type="radio"
                name={ROLE_TRAIT_FIELD_NAME}
                value={opt.value}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange([opt.value])}
                className="h-4 w-4 border-border accent-[color:var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              />
              {opt.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
