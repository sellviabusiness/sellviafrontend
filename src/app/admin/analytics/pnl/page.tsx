import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/auth/config";
import { PnlView } from "./pnl-view";
import { RealPnlView } from "./real-pnl-view";

export const metadata = { title: "Monthly P&L — SellVia Admin" };

export default async function PnlPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return isMockMode ? <PnlView actorEmail={session.email} /> : <RealPnlView />;
}
