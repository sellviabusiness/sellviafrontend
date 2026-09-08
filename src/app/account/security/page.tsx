import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/auth/session";
import { SecurityView } from "./security-view";

// Rebuilt against the CURRENT auth system (@/lib/auth/session) — the previous
// version of this page used @/lib/ory/session, a completely different,
// disconnected session mechanism from what /login now actually populates
// (found in the B5 audit). proxy.ts's /account/* gate had the same bug,
// fixed separately (see src/proxy.ts + lib/auth/proxy-session.ts) — both had
// to change for this page to be reachable at all, not just this file.
export const metadata: Metadata = {
  title: "Security",
  robots: { index: false, follow: false },
};

export default async function AccountSecurityPage() {
  const session = await getServerSession();
  if (!session) {
    redirect(`/login?return_to=${encodeURIComponent("/account/security")}`);
  }

  return <SecurityView roles={session.roles} />;
}
