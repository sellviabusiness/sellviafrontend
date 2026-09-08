import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { AnalyticsHubView } from "./analytics-hub-view";

export const metadata = { title: "Analytics — SellVia Admin" };

export default async function AdminAnalyticsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <AnalyticsHubView />;
}
