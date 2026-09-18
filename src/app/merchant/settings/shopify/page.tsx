import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { ShopifySettingsView } from "./shopify-settings-view";

export const metadata = { title: "Shopify connection" };

export default async function ShopifySettingsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <ShopifySettingsView />;
}
