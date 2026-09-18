import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { CreatorProfileView } from "./creator-profile-view";

export const metadata = { title: "Profile" };

export default async function CreatorProfilePage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <CreatorProfileView />;
}
