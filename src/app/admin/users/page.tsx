import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/auth/config";
import { UsersView } from "./users-view";
import { RealUsersView } from "./real-users-view";

export const metadata = { title: "Users — SellVia Admin" };

export default async function AdminUsersPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return isMockMode ? <UsersView /> : <RealUsersView />;
}
