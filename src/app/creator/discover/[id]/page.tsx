import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { OfferApplyView } from "./offer-apply-view";

export const metadata = { title: "Offer details — SellVia" };

export default async function CreatorOfferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const { id } = await params;
  return <OfferApplyView email={session.email} offerId={id} />;
}
