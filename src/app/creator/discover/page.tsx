import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/auth/config";
import { DiscoverView } from "./discover-view";
import { RealDiscoverView } from "./real-discover-view";

export const metadata = { title: "Discover" };

export default async function CreatorDiscoverPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return isMockMode ? <DiscoverView email={session.email} /> : <RealDiscoverView />;
}
