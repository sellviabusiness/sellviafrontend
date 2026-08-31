import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { OfferDetailView } from "./offer-detail-view";

export const metadata = { title: "Offer — SellVia" };

export default async function OfferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const { id } = await params;
  return <OfferDetailView email={session.email} offerId={id} />;
}
