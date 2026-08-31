"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { OnboardingLayout } from "@/components/onboarding/onboarding-layout";
import { OnboardingNav } from "@/components/onboarding/onboarding-nav";
import { FormErrorText } from "@/components/reference/ui/form-error-text";
import { cn } from "@/lib/utils";
import { authProvider } from "@/lib/auth/provider";
import { getOnboardingRecord, saveRoles } from "@/lib/onboarding/store";
import { nextIncompleteStep, STEP_PATH } from "@/lib/onboarding/steps";

const ROLE_OPTIONS = [
  { value: "merchant", label: "Merchant", hint: "Sell and promote your products" },
  { value: "creator", label: "Creator", hint: "Promote products and earn commissions" },
] as const;

/**
 * C1 — always shown post-signup/post-login, before the rest of onboarding, even if a role
 * already exists in the session (see page.tsx's doc comment). Supports Merchant-only,
 * Creator-only, or both — selecting both does not create a second account, it's the same
 * OnboardingRecord/session carrying two roles (see steps.ts's dual-role sequence).
 *
 * Confirming/changing the role here calls authProvider.updateRoles so the change reaches the
 * live session too (mock: real, re-issues the session cookie; kratos: documented no-op — see
 * lib/auth/types.ts), not just the local onboarding record — closing the gap the onboarding
 * audit flagged where a role change here wouldn't otherwise propagate back to Feature 1's
 * session.
 */
export function RoleSelectView({ email, sessionRoles }: { email: string; sessionRoles: string[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Prefer an existing onboarding record (a prior visit already ran this step) over the
    // session's roles, so a later Feature-1-side change can't silently overwrite an in-progress
    // onboarding choice — localStorage is only readable client-side, hence the effect.
    const record = getOnboardingRecord(email);
    const initial = record?.roles && record.roles.length > 0 ? record.roles : sessionRoles;
    if (initial.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally runs once on mount
  }, []);

  function toggle(value: string) {
    setError(null);
    setSelected((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (selected.length === 0) {
      setError("Choose at least one to continue.");
      return;
    }
    setSubmitting(true);
    const record = saveRoles(email, selected);
    await authProvider.updateRoles(email, selected);
    const next = nextIncompleteStep(selected, record);
    router.push(STEP_PATH[next]);
  }

  return (
    <OnboardingLayout step="role-select" roles={selected}>
      <div className="mb-5 space-y-1">
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">
          Tell us how you&apos;ll use SellVia
        </h1>
        <p className="text-sm text-muted-foreground">You can select both if they both fit.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <fieldset className="space-y-2">
          <legend className="sr-only">I want to join as</legend>
          <div className="grid grid-cols-2 gap-2">
            {ROLE_OPTIONS.map((opt) => {
              const checked = selected.includes(opt.value);
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
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(opt.value)}
                      className="h-4 w-4 rounded-sm border-border accent-[color:var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    />
                    {opt.label}
                  </span>
                  <span className="pl-6 text-xs text-muted-foreground">{opt.hint}</span>
                </label>
              );
            })}
          </div>
          {error && <FormErrorText id="roles-error">{error}</FormErrorText>}
        </fieldset>

        <OnboardingNav nextLabel="Continue" loading={submitting} />
      </form>
    </OnboardingLayout>
  );
}
