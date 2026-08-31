import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { CreatorProfileView } from "./creator-profile-view";

export const metadata = { title: "Tell us about your content — SellVia" };

export default async function CreatorProfilePage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return <CreatorProfileView email={session.email} sessionRoles={session.roles} />;
}
