import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/auth/config";
import { OverviewView } from "./overview-view";
import { RealOverviewView } from "./real-overview-view";

export const metadata = { title: "Overview" };

export default async function CreatorOverviewPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return isMockMode ? <OverviewView email={session.email} /> : <RealOverviewView email={session.email} />;
}
