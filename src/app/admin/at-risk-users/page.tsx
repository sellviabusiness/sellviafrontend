import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { AtRiskUsersView } from "./at-risk-users-view";

export const metadata = { title: "At-Risk Users — SellVia Admin" };

export default async function AtRiskUsersPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <AtRiskUsersView />;
}
