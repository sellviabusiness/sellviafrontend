import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/auth/config";
import { DashboardView } from "./dashboard-view";
import { RealDashboardView } from "./real-dashboard-view";

export const metadata = { title: "Admin Dashboard" };

export default async function AdminDashboardPage() {
  const session = await getServerSession();
  if (!session) redirect("/login"); // layout.tsx already guards this; kept for a standalone-safe page
  return isMockMode ? <DashboardView /> : <RealDashboardView />;
}
