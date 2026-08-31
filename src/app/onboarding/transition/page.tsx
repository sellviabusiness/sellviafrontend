import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { TransitionView } from "./transition-view";

export const metadata = { title: "Merchant profile ready — SellVia" };

export default async function TransitionPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return <TransitionView email={session.email} sessionRoles={session.roles} />;
}
