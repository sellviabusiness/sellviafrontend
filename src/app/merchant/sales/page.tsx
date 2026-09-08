import { Suspense } from "react";
import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/auth/config";
import { SalesView } from "./sales-view";
import { RealSalesView } from "./real-sales-view";

export const metadata = { title: "Sales" };

export default async function SalesPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return (
    <Suspense>
      {isMockMode ? <SalesView email={session.email} /> : <RealSalesView />}
    </Suspense>
  );
}
