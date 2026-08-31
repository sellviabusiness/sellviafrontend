import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { STEP_PATH } from "@/lib/onboarding/steps";

/**
 * Entry point: ALWAYS starts at /role-select, even when the session already carries a role from
 * Feature 1 registration — the user must be able to confirm or change it here, not just have it
 * silently reused (C1: "Do NOT skip this screen simply because a role already exists in the
 * session."). Whichever step is actually reached still course-corrects further forward via
 * useOnboardingStep if the user already made progress in an earlier visit (it has to check
 * localStorage client-side to know that — see lib/onboarding/steps.ts).
 */
export default async function OnboardingIndexPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  redirect(STEP_PATH["role-select"]);
}
