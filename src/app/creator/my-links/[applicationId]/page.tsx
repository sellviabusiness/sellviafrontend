import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { LinkDetailView } from "./link-detail-view";

export const metadata = { title: "Link details — SellVia" };

export default async function CreatorLinkDetailPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const { applicationId } = await params;
  return <LinkDetailView applicationId={applicationId} />;
}
