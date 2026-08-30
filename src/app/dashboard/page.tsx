import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { AUTH_MODE } from "@/lib/auth/config";
import { isOnboardingComplete } from "@/lib/onboarding/status";
import { LogoutButton } from "./logout-button";
import { SellViaLogo } from "@/components/reference/brand/sellvia-logo";

export const metadata = { title: "Dashboard — SellVia" };

/**
 * Minimal placeholder — NOT Feature 3's real App Shell / Merchant/Creator dashboard (out of scope
 * for this playbook). Exists only as somewhere real for a successful login/registration/
 * verification/onboarding to land, so those flows are actually testable end-to-end.
 *
 * The onboarding-complete gate (direct-URL bypass prevention) lives here, the one integration
 * point Feature 2 needed in Feature 1/placeholder territory. No Feature 1 auth file itself was
 * touched.
 */
export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (!(await isOnboardingComplete(session))) redirect("/onboarding");
  // Feature 4/5 integration point: Merchant and Creator sessions now both have somewhere real to
  // land (Playbooks 04/05). Merchant takes priority for a dual-role account, matching this file's
  // pre-existing ordering — the topbar's own role switcher (both shells) covers the other side.
  if (session.roles.includes("merchant")) redirect("/merchant/overview");
  if (session.roles.includes("creator")) redirect("/creator/overview");
  if (session.roles.includes("admin")) redirect("/admin/dashboard");

  const { email, verified, roles } = session;

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-4 py-12">
      <div className="flex items-center justify-between">
        <SellViaLogo />
      </div>
      <div className="rounded-[var(--radius-md)] border border-border p-8">
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">
          You&apos;re signed in
        </h1>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="text-foreground">{email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Email verified</dt>
            <dd className="text-foreground">{verified ? "Yes" : "No"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Role(s)</dt>
            <dd className="text-foreground">{roles.length ? roles.join(", ") : "none selected"}</dd>
          </div>
        </dl>
        <p className="mt-6 text-xs text-muted-foreground-2">
          This is a placeholder landing page for Feature 1 (Authentication) and Feature 2
          (Onboarding) only. The real Merchant/Creator dashboard (Feature 3 — App Shell & Role
          Context) is a separate, not-yet-built feature.
          {AUTH_MODE === "mock" && " Auth is currently running against the local mock provider — no real Kratos involved."}
        </p>
        <div className="mt-6">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
