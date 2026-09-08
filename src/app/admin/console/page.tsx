import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/auth/config";
import { ConsoleView } from "./console-view";
import { NotAvailableReal } from "@/components/admin/not-available-real";

export const metadata = { title: "AI Console — SellVia Admin" };

export default async function AdminConsolePage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (!isMockMode) {
    return <NotAvailableReal title="AI console" reason="No real tool-calling agent backend exists yet — this console has nothing to talk to." />;
  }
  return <ConsoleView actorEmail={session.email} />;
}
