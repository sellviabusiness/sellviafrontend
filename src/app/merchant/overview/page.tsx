import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isOnboardingComplete } from "@/lib/onboarding/status";
import { OverviewView } from "./overview-view";

export const metadata = { title: "Overview — SellVia" };

export default async function MerchantOverviewPage() {
  const session = await getServerSession();
  if (!session) redirect("/login"); // layout.tsx already guards this; kept for a standalone-safe page

  // layout.tsx already redirects an incomplete session to /onboarding before this ever renders —
  // this is a real (not hardcoded-true) check anyway, so D1's onboarding-gate banner has a real
  // signal to react to, not a permanently-false prop.
  const onboardingComplete = await isOnboardingComplete(session);

  return <OverviewView email={session.email} onboardingComplete={onboardingComplete} />;
}
