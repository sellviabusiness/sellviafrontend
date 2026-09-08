import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/auth/config";
import { NewOfferView } from "./new-offer-view";
import { RealNewOfferView } from "./real-new-offer-view";

export const metadata = { title: "Create offer" };

export default async function NewOfferPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return isMockMode ? <NewOfferView email={session.email} /> : <RealNewOfferView />;
}
