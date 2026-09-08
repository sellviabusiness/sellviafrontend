import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/auth/config";
import { RefundsDisputesView } from "./refunds-disputes-view";
import { RealRefundsDisputesView } from "./real-refunds-disputes-view";

export const metadata = { title: "Refunds & Disputes — SellVia Admin" };

export default async function RefundsDisputesPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return isMockMode ? <RefundsDisputesView actorEmail={session.email} /> : <RealRefundsDisputesView />;
}
