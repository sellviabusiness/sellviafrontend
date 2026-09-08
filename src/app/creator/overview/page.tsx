import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { OverviewView } from "./overview-view";

export const metadata = { title: "Overview — SellVia" };

export default async function CreatorOverviewPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return <OverviewView email={session.email} />;
}
