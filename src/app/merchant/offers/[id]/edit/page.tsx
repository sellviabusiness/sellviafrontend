import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/auth/config";
import { EditOfferView } from "./edit-offer-view";
import { RealEditOfferView } from "./real-edit-offer-view";

export const metadata = { title: "Edit offer" };

/**
 * Offer records are localStorage-backed (client-only) in mock mode — this server page can't read
 * them, so it just resolves the id and hands off; EditOfferView fetches + handles "not found"
 * client-side. Real mode follows the same client-side-fetch shape (RealEditOfferView fetches by
 * offerId and gates on status === "draft" itself) rather than a server-side getOffer, mirroring
 * how [id]/page.tsx defers to RealOfferDetailView.
 */
export default async function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const { id } = await params;
  return isMockMode ? <EditOfferView email={session.email} offerId={id} /> : <RealEditOfferView offerId={id} />;
}
