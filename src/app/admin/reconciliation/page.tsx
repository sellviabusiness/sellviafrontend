import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/auth/config";
import { ReconciliationView } from "./reconciliation-view";
import { NotAvailableReal } from "@/components/admin/not-available-real";

export const metadata = { title: "Reconciliation — SellVia Admin" };

export default async function ReconciliationPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (!isMockMode) {
    return (
      <NotAvailableReal
        title="Reconciliation"
        reason="No real endpoint exists yet to reconcile Switch settlement records against SellVia's own billing cycles."
      />
    );
  }
  return <ReconciliationView actorEmail={session.email} />;
}
