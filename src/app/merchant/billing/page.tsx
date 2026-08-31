import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { BillingCyclesView } from "./billing-cycles-view";

export const metadata = { title: "Billing — SellVia" };

export default async function MerchantBillingPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return <BillingCyclesView email={session.email} />;
}
