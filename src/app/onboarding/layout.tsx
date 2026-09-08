import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { isOnboardingComplete } from "@/lib/onboarding/status";
import { ReferenceThemeScope } from "@/components/reference/theme-scope";

/**
 * Guards every /onboarding/* route: must be authenticated (Feature 1's session, unchanged),
 * and must not have already finished onboarding (sent straight to /dashboard instead — no
 * reason to redo a completed flow). Individual step pages layer their own "are this step's
 * prerequisites actually met yet" check on top (lib/onboarding/steps.ts isStepUnlocked).
 *
 * ReferenceThemeScope wrapper added (not in the original file) — reference's own
 * ThemeProvider/tokens, scoped here rather than this repo's shared root layout. See
 * src/app/login/layout.tsx for the full reasoning.
 */
export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (await isOnboardingComplete(session)) redirect("/dashboard");

  return <ReferenceThemeScope>{children}</ReferenceThemeScope>;
}
