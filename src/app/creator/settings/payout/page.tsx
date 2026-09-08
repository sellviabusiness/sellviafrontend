import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/auth/config";
import { PayoutSettingsView } from "./payout-settings-view";
import { RealPayoutSettingsView } from "./real-payout-settings-view";

export const metadata = { title: "Payout method" };

export default async function CreatorPayoutSettingsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return isMockMode ? <PayoutSettingsView email={session.email} /> : <RealPayoutSettingsView />;
}
