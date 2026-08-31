import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { SecuritySettingsView } from "./security-settings-view";

export const metadata = { title: "Security — SellVia" };

export default async function SecuritySettingsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return <SecuritySettingsView />;
}
