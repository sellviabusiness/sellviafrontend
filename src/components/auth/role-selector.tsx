import { cn } from "@/lib/utils";

/**
 * ASSUMPTION FLAGGED FOR CONFIRMATION (see Docs/Frontend/Playbooks/01-authentication.md §9 and
 * the chat response accompanying this build): Docs/Security/Authentication states role is
 * stored as an Ory Kratos identity *trait*, read from the session server-side, but no doc gives
 * the actual trait key/shape configured in the Kratos identity schema (single string vs. array,
 * exact field name). This submits it as `traits.roles`, a checkbox array (Merchant, Creator, or
 * both — Docs/Business Logic/User Roles confirms dual-role accounts), inside the same <form> as
 * Kratos's own registration nodes, so it rides along with the real registration submission.
 *
 * If the real identity schema uses a different key (or doesn't accept role at signup at all —
 * i.e. role/profile creation is actually a separate post-registration API call, not yet built),
 * change ROLE_TRAIT_FIELD_NAME below or remove this component's wiring. Either way Kratos's own
 * validation will surface the mismatch honestly (a real rejected field), not a silent no-op.
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
  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-foreground">
        I want to join as <span aria-hidden="true" className="text-danger">*</span>
      </legend>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((opt) => {
          const checked = selected.includes(opt.value);
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
                type="checkbox"
                name={ROLE_TRAIT_FIELD_NAME}
                value={opt.value}
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(opt.value)}
                className="h-4 w-4 rounded-sm border-border accent-[color:var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              />
              {opt.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
