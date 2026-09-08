import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/auth/config";
import { UnitEconomicsView } from "./unit-economics-view";
import { NotAvailableReal } from "@/components/admin/not-available-real";

export const metadata = { title: "Unit Economics — SellVia Admin" };

export default async function UnitEconomicsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (!isMockMode) {
    return <NotAvailableReal title="Unit economics" reason="No real endpoint exists yet for CAC/LTV or per-unit cost breakdowns." />;
  }
  return <UnitEconomicsView />;
}
