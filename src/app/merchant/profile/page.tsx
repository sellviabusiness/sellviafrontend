import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { MerchantProfileView } from "./merchant-profile-view";

export const metadata = { title: "Profile" };

export default async function MerchantProfilePage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <MerchantProfileView />;
}
