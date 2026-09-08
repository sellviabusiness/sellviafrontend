import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/auth/config";
import { EditOfferView } from "./edit-offer-view";

export const metadata = { title: "Edit offer" };

/**
 * Offer records are localStorage-backed (client-only) — this server page can't read them, so it
 * just resolves the id and hands off; EditOfferView fetches + handles "not found" client-side.
 *
 * Real mode has no edit endpoint at all (deliberate — API-ENDPOINTS.md's "Known Gaps": Offers
 * have no PATCH-the-whole-record route, only the narrow status transition and Admin's
 * commission-rate override). This route simply doesn't exist for a real offer — redirect to the
 * detail page rather than 404 or show a form with nowhere to submit.
 */
export default async function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const { id } = await params;
  if (!isMockMode) redirect(`/merchant/offers/${id}`);
  return <EditOfferView email={session.email} offerId={id} />;
}
