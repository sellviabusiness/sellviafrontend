import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { TransitionView } from "./transition-view";

export const metadata = { title: "Merchant profile ready" };

export default async function TransitionPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return <TransitionView email={session.email} id={session.id} sessionRoles={session.roles} />;
}
