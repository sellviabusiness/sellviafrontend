import { Suspense } from "react";
import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/auth/config";
import { ApplicationsView } from "./applications-view";
import { RealApplicationsView } from "./real-applications-view";

export const metadata = { title: "Applications" };

export default async function ApplicationsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return (
    <Suspense>
      {isMockMode ? <ApplicationsView email={session.email} /> : <RealApplicationsView />}
    </Suspense>
  );
}
