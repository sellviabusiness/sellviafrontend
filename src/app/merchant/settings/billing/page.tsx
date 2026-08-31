import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { BillingSettingsView } from "./billing-settings-view";

export const metadata = { title: "Billing method — SellVia" };

export default async function BillingSettingsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return <BillingSettingsView email={session.email} />;
}
