import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { ApplicationsView } from "./applications-view";

export const metadata = { title: "My Applications — SellVia" };

export default async function CreatorApplicationsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return <ApplicationsView email={session.email} />;
}
