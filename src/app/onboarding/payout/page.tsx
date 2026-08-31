import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { PayoutView } from "./payout-view";

export const metadata = { title: "Payout details — SellVia" };

export default async function PayoutPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return <PayoutView email={session.email} sessionRoles={session.roles} />;
}
