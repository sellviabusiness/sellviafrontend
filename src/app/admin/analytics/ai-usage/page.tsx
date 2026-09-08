import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/auth/config";
import { AiUsageView } from "./ai-usage-view";
import { NotAvailableReal } from "@/components/admin/not-available-real";

export const metadata = { title: "AI / Token Usage — SellVia Admin" };

export default async function AiUsagePage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (!isMockMode) {
    return <NotAvailableReal title="AI / token usage" reason="No real endpoint exists yet to log AI/token spend — this is why P&L's AI costs line stays at zero." />;
  }
  return <AiUsageView />;
}
