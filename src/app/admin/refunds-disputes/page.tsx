import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { RefundsDisputesView } from "./refunds-disputes-view";

export const metadata = { title: "Refunds & Disputes — SellVia Admin" };

export default async function RefundsDisputesPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <RefundsDisputesView actorEmail={session.email} />;
}
