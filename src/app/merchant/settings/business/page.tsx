import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { BusinessSettingsView } from "./business-settings-view";

export const metadata = { title: "Business profile" };

export default async function BusinessSettingsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return <BusinessSettingsView email={session.email} />;
}
