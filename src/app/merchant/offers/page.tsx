import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/auth/config";
import { OffersView } from "./offers-view";
import { RealOffersView } from "./real-offers-view";

export const metadata = { title: "Offers" };

export default async function MerchantOffersPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return isMockMode ? <OffersView email={session.email} /> : <RealOffersView email={session.email} />;
}
