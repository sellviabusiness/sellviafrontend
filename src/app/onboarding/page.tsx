import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { STEP_PATH } from "@/lib/onboarding/steps";

/**
 * Entry point: routes straight to /about-you, the first real onboarding step.
 *
 * There used to be a /role-select screen here first — removed outright, not just skipped
 * client-side (that was the previous, weaker fix): the role is already decided at signup
 * (RoleSelector there, required before an account can even be created), so re-asking it here was
 * pure redundant friction with no data left to collect. Every step from here on already resolves
 * roles from the session first (getEffectiveRoles, see lib/onboarding/steps.ts) — nothing
 * downstream depended on a local write happening at this entry point.
 */
export default async function OnboardingIndexPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  redirect(STEP_PATH["about-you"]);
}
