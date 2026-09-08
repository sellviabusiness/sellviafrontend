import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { CompleteView } from "./complete-view";

export const metadata = { title: "You're all set" };

export default async function OnboardingCompletePage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return <CompleteView email={session.email} id={session.id} sessionRoles={session.roles} />;
}
