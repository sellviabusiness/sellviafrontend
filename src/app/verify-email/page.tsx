import { Suspense } from "react";
import { VerifyEmailView } from "./verify-email-view";

export const metadata = { title: "Verify your email — SellVia" };

// Deliberately no "already authenticated → redirect" gate: this screen's whole purpose is
// "authenticated but unverified" (Docs/Frontend/Playbooks/01-authentication.md §1), so having a
// session is the expected, normal case here, not a reason to bounce elsewhere.
export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailView />
    </Suspense>
  );
}
