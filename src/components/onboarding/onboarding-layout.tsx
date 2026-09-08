import type { ReactNode } from "react";
import { SellViaLogo } from "@/components/reference/brand/sellvia-logo";
import { Card } from "@/components/reference/ui/card";
import { StepIndicator } from "./step-indicator";
import type { StepId } from "@/lib/onboarding/types";

/**
 * Same centered-page shape as the auth screens, slightly wider to fit the longer onboarding
 * forms — logo above the card, one bordered card, step indicator inside it. No sidebar/topbar
 * here — this is Feature 2, not the Feature 3 App Shell.
 *
 * No theme toggle (removed — senior's explicit requirement): the toggle belongs only inside the
 * Merchant/Creator dashboards, never on Onboarding screens.
 */
export function OnboardingLayout({
  step,
  roles,
  children,
}: {
  step: StepId;
  roles: string[];
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 sm:px-6">
      <div className="w-full max-w-[520px]">
        <div className="mb-5">
          <SellViaLogo href="/dashboard" />
        </div>

        <Card className="p-6 sm:p-7">
          <StepIndicator current={step} roles={roles} />
          <div className="mt-5">{children}</div>
        </Card>
      </div>
    </div>
  );
}
