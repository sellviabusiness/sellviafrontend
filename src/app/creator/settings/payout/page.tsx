import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { PayoutSettingsView } from "./payout-settings-view";

export const metadata = { title: "Payout method — SellVia" };

export default async function CreatorPayoutSettingsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return <PayoutSettingsView email={session.email} />;
}
