import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { DashboardView } from "./dashboard-view";

export const metadata = { title: "Admin Dashboard — SellVia" };

export default async function AdminDashboardPage() {
  const session = await getServerSession();
  if (!session) redirect("/login"); // layout.tsx already guards this; kept for a standalone-safe page
  return <DashboardView />;
}
