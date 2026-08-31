import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { NewOfferView } from "./new-offer-view";

export const metadata = { title: "Create offer — SellVia" };

export default async function NewOfferPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return <NewOfferView email={session.email} />;
}
