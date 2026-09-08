import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { UserDetailView } from "./user-detail-view";

export const metadata = { title: "User detail — SellVia Admin" };

export default async function AdminUserDetailPage({ params }: { params: Promise<{ email: string }> }) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  const { email } = await params;
  return <UserDetailView email={decodeURIComponent(email)} actorEmail={session.email} />;
}
