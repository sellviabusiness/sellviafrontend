import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { EditOfferView } from "./edit-offer-view";

export const metadata = { title: "Edit offer — SellVia" };

/**
 * Offer records are localStorage-backed (client-only) — this server page can't read them, so it
 * just resolves the id and hands off; EditOfferView fetches + handles "not found" client-side.
 */
export default async function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const { id } = await params;
  return <EditOfferView email={session.email} offerId={id} />;
}
