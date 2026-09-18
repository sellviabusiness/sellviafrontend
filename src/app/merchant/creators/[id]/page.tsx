import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { CreatorPublicProfileView } from "./creator-public-profile-view";

export const metadata = { title: "Creator profile" };

/**
 * Public creator profile, viewed by a merchant — resolved from the route's `id`
 * (RealApplication.creatorProfileId), never the merchant's own session identity. Distinct from
 * `/merchant/profile` (the merchant's own profile) on purpose — see that route's own page.tsx.
 */
export default async function MerchantViewsCreatorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  const { id } = await params;
  return <CreatorPublicProfileView creatorProfileId={id} />;
}
