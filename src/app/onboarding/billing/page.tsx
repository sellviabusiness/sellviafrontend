import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { BillingView } from "./billing-view";

export const metadata = { title: "Connect billing — SellVia" };

export default async function BillingPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return <BillingView email={session.email} sessionRoles={session.roles} />;
}
