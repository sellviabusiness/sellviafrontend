import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { DiscoverView } from "./discover-view";

export const metadata = { title: "Discover — SellVia" };

export default async function CreatorDiscoverPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return <DiscoverView email={session.email} />;
}
