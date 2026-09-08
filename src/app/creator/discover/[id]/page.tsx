import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/auth/config";
import { OfferApplyView } from "./offer-apply-view";
import { RealOfferApplyView } from "./real-offer-apply-view";

export const metadata = { title: "Offer details" };

export default async function CreatorOfferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const { id } = await params;
  return isMockMode ? (
    <OfferApplyView email={session.email} offerId={id} />
  ) : (
    <RealOfferApplyView email={session.email} offerId={id} />
  );
}
