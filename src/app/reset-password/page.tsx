import { Suspense } from "react";
import { ResetPasswordView } from "./reset-password-view";

export const metadata = { title: "Set a new password — SellVia" };

// No server-side "already authenticated → redirect" check here: arriving with a valid
// ?flow= is itself only possible via a fresh, privileged Kratos redirect (Docs/Security/
// Session Management's re-auth-for-sensitive-actions principle) — a signed-in user should
// still be able to complete it.
export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordView />
    </Suspense>
  );
}
