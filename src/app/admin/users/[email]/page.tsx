import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/auth/config";
import { UserDetailView } from "./user-detail-view";
import { RealUserDetailView } from "./real-user-detail-view";

export const metadata = { title: "User detail — SellVia Admin" };

// Route segment is named [email] from the mock era — in real mode it holds the user's id
// instead (RealUsersView links with the id), not an email; just an opaque path segment either
// way, so no rename needed for this to work.
export default async function AdminUserDetailPage({ params }: { params: Promise<{ email: string }> }) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  const { email } = await params;
  return isMockMode ? (
    <UserDetailView email={decodeURIComponent(email)} actorEmail={session.email} />
  ) : (
    <RealUserDetailView userId={email} />
  );
}
