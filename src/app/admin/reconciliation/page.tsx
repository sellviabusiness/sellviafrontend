import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { ReconciliationView } from "./reconciliation-view";

export const metadata = { title: "Reconciliation — SellVia Admin" };

export default async function ReconciliationPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <ReconciliationView actorEmail={session.email} />;
}
