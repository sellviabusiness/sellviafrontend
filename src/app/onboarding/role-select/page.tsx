import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { RoleSelectView } from "./role-select-view";

export const metadata = { title: "Get started — SellVia" };

/**
 * C1 — always the first onboarding screen, even when Feature 1 registration already collected a
 * role: the user must be able to confirm or change it here, not just have it silently reused.
 * `sessionRoles` seeds the pre-checked boxes when there's no onboarding record yet; once a
 * record exists (a prior visit already ran this step), the view prefers the record instead so a
 * later Feature-1-side change doesn't stomp an in-progress onboarding choice.
 */
export default async function RoleSelectPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return <RoleSelectView email={session.email} sessionRoles={session.roles} />;
}
