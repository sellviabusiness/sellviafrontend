import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { EarningsView } from "./earnings-view";

export const metadata = { title: "Earnings — SellVia" };

export default async function CreatorEarningsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return <EarningsView email={session.email} />;
}
