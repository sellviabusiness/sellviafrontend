import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/auth/config";
import { BillingCyclesView } from "./billing-cycles-view";
import { RealBillingCyclesView } from "./real-billing-cycles-view";

export const metadata = { title: "Billing" };

export default async function MerchantBillingPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return isMockMode ? <BillingCyclesView email={session.email} /> : <RealBillingCyclesView />;
}
