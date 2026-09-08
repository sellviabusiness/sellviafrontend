import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { isOnboardingComplete } from "@/lib/onboarding/status";
import { MerchantAppShell } from "@/components/merchant/app-shell";
import { ReferenceThemeScope } from "@/components/reference/theme-scope";

/**
 * Route guard for every /merchant/* screen: no session -> /login; onboarding incomplete ->
 * /onboarding (Playbook 02's gate, reused unchanged); no "merchant" role on the session ->
 * /dashboard.
 *
 * ASSUMPTION FLAGGED (Playbook 03 §11 item 1, left open there): a Creator-only account hitting
 * /merchant/* redirects to /dashboard (the existing Feature 1/2 placeholder) rather than a
 * dedicated "wrong role" screen or the not-yet-built Creator dashboard. Cheapest safe default;
 * revisit once the Creator dashboard (Playbook 04) exists.
 *
 * ReferenceThemeScope wrapper added (not in the original file) — reference's own
 * ThemeProvider/tokens, scoped here rather than this repo's shared root layout. See
 * src/app/login/layout.tsx for the full reasoning. Note this REPLACES this repo's
 * own pre-existing /merchant/layout.tsx (Kratos/role-based gating, built earlier this
 * session) — that one gated on this repo's own session/role model, this one gates on
 * the reference's own mock/Kratos-provider session model. The two are not compatible;
 * this file is now the only one in effect for /merchant/*.
 */
export default async function MerchantLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (!(await isOnboardingComplete(session))) redirect("/onboarding");
  if (!session.roles.includes("merchant")) redirect("/dashboard");

  return (
    <ReferenceThemeScope>
      <MerchantAppShell email={session.email} roles={session.roles}>
        {children}
      </MerchantAppShell>
    </ReferenceThemeScope>
  );
}
