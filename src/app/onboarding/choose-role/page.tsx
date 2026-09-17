import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { ChooseRoleView } from "./choose-role-view";

export const metadata = { title: "Choose your role" };

/**
 * Only landed on from /sso-callback (see its navigateToApp), for a Google/Apple sign-in that just
 * created a brand-new, role-less account — password signup already collects this via
 * RoleSelector on /register itself before the account exists, so this page is OAuth-only. A
 * session that already holds a role has nothing to choose here, so it's sent straight on;
 * revisiting this URL directly can't re-litigate an existing account's role.
 */
export default async function ChooseRolePage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (session.roles.length > 0) redirect("/dashboard");

  return <ChooseRoleView />;
}
