import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { SupportView } from "./support-view";

export const metadata = { title: "Support — SellVia" };

/** Shared by both Merchant and Creator (linked from both topbars' account menus) — same
 *  "account-level, not role-level" reasoning as /account/security and F2's delete-account entry
 *  points, so this lives at the top level rather than duplicated under each role. */
export default async function SupportPage() {
  const session = await getServerSession();
  if (!session) redirect(`/login?return_to=${encodeURIComponent("/support")}`);

  return <SupportView email={session.email} />;
}
