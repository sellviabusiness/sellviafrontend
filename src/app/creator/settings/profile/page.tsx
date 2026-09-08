import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { ProfileSettingsView } from "./profile-settings-view";

export const metadata = { title: "Profile — SellVia" };

export default async function CreatorProfileSettingsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return <ProfileSettingsView email={session.email} />;
}
