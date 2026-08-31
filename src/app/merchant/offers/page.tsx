import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { OffersView } from "./offers-view";

export const metadata = { title: "Offers — SellVia" };

export default async function MerchantOffersPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return <OffersView email={session.email} />;
}
