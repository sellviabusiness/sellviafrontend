"use client";

import { cn } from "@/lib/utils";

export interface RadioOption {
  value: string;
  label: string;
  hint?: string;
}

/** Bordered-card radio picker — same visual language as the role picker on /onboarding/role-select
 *  (accent border when selected), reused for product type and payout method so both "pick one"
 *  moments in onboarding look and behave the same way. */
export function RadioGroup({
  name,
  options,
  value,
  onChange,
  columns = 2,
}: {
  name: string;
  options: RadioOption[];
  value: string | undefined;
  onChange: (value: string) => void;
  columns?: 1 | 2 | 3;
}) {
  return (
    <div className={cn("grid gap-2", columns === 1 ? "grid-cols-1" : columns === 2 ? "grid-cols-2" : "grid-cols-3")}>
      {options.map((opt) => {
        const checked = value === opt.value;
        return (
          <label
            key={opt.value}
            className={cn(
              "flex cursor-pointer flex-col gap-0.5 rounded-[var(--radius-sm)] border px-3.5 py-2.5 text-sm transition-colors",
              checked ? "border-accent" : "border-border hover:border-border-hover",
            )}
          >
            <span className="flex items-center gap-2 font-medium text-foreground">
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={checked}
                onChange={() => onChange(opt.value)}
                className="h-4 w-4 border-border accent-[color:var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
              {opt.label}
            </span>
            {opt.hint && <span className="pl-6 text-xs text-muted-foreground">{opt.hint}</span>}
          </label>
        );
      })}
    </div>
  );
}
