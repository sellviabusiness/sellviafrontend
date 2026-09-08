import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { AiUsageView } from "./ai-usage-view";

export const metadata = { title: "AI / Token Usage — SellVia Admin" };

export default async function AiUsagePage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <AiUsageView />;
}
