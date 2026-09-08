import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { UsersView } from "./users-view";

export const metadata = { title: "Users — SellVia Admin" };

export default async function AdminUsersPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <UsersView />;
}
