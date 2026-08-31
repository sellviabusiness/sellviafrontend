import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { isOnboardingComplete } from "@/lib/onboarding/status";
import { CreatorAppShell } from "@/components/creator/app-shell";
import { ReferenceThemeScope } from "@/components/reference/theme-scope";

/**
 * Route guard for every /creator/* screen — same shape as merchant/layout.tsx: no session ->
 * /login; onboarding incomplete -> /onboarding; no "creator" role -> /dashboard.
 *
 * Playbook 05 §4/§16: replaces the old components/shell/app-shell.tsx (ContextSwitcher/
 * RoleEmptyState/ROLE_NAV) with the reference-styled CreatorAppShell, mirroring Merchant's own
 * Playbook 04 shell — approved specifically so a dual-role account sees one consistent design
 * switching between /merchant/* and /creator/*, not two different systems. The session/
 * onboarding-gate logic itself was already correct (fixed in the redirect-loop task) and is
 * unchanged here.
 */
export default async function CreatorLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (!(await isOnboardingComplete(session))) redirect("/onboarding");
  if (!session.roles.includes("creator")) redirect("/dashboard");

  return (
    <ReferenceThemeScope>
      <CreatorAppShell email={session.email} roles={session.roles}>
        {children}
      </CreatorAppShell>
    </ReferenceThemeScope>
  );
}
