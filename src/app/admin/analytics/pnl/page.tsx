import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { PnlView } from "./pnl-view";

export const metadata = { title: "Monthly P&L — SellVia Admin" };

export default async function PnlPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <PnlView actorEmail={session.email} />;
}
