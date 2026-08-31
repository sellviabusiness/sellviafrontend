import { Suspense } from "react";
import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { ApplicationsView } from "./applications-view";

export const metadata = { title: "Applications — SellVia" };

export default async function ApplicationsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return (
    <Suspense>
      <ApplicationsView email={session.email} />
    </Suspense>
  );
}
