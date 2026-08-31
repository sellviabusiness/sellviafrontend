"use client";

import { Button } from "@/components/reference/ui/button";

/** Shared Back/Next row — every step form ends with this. Back is omitted (not disabled) on
 *  the first step of a run, matching the same "absent, not disabled" convention used elsewhere. */
export function OnboardingNav({
  onBack,
  nextLabel = "Continue",
  loading,
}: {
  onBack?: () => void;
  nextLabel?: string;
  loading?: boolean;
}) {
  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      {onBack ? (
        <Button type="button" variant="secondary" onClick={onBack} disabled={loading}>
          Back
        </Button>
      ) : (
        <span />
      )}
      <Button type="submit" loading={loading}>
        {nextLabel}
      </Button>
    </div>
  );
}
