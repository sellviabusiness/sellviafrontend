import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { MerchantPublicProfileView } from "./merchant-public-profile-view";

export const metadata = { title: "Merchant profile" };

/**
 * Public merchant profile, viewed by a creator — resolved from the route's `id`
 * (RealOffer.merchantProfileId), never the creator's own session identity. Distinct from
 * `/creator/profile` (the creator's own profile) on purpose — see that route's own page.tsx.
 */
export default async function CreatorViewsMerchantProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  const { id } = await params;
  return <MerchantPublicProfileView merchantProfileId={id} />;
}
