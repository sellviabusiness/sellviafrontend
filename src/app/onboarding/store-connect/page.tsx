import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { StoreConnectView } from "./store-connect-view";

export const metadata = { title: "Connect your Shopify store — SellVia" };

export default async function StoreConnectPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return <StoreConnectView email={session.email} sessionRoles={session.roles} />;
}
