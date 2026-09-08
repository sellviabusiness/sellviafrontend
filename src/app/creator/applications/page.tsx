import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/auth/config";
import { ApplicationsView } from "./applications-view";
import { RealApplicationsView } from "./real-applications-view";

export const metadata = { title: "Applications" };

export default async function CreatorApplicationsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return isMockMode ? <ApplicationsView email={session.email} /> : <RealApplicationsView />;
}
