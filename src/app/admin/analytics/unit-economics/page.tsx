import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { UnitEconomicsView } from "./unit-economics-view";

export const metadata = { title: "Unit Economics — SellVia Admin" };

export default async function UnitEconomicsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <UnitEconomicsView />;
}
