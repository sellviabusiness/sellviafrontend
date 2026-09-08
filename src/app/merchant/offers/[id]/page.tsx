import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/auth/config";
import { OfferDetailView } from "./offer-detail-view";
import { RealOfferDetailView } from "./real-offer-detail-view";

export const metadata = { title: "Offer" };

export default async function OfferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const { id } = await params;
  return isMockMode ? <OfferDetailView email={session.email} offerId={id} /> : <RealOfferDetailView offerId={id} />;
}
