import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/auth/config";
import { EarningsView } from "./earnings-view";
import { RealEarningsView } from "./real-earnings-view";

export const metadata = { title: "Earnings" };

export default async function CreatorEarningsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return isMockMode ? <EarningsView email={session.email} /> : <RealEarningsView />;
}
