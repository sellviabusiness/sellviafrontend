import { Suspense } from "react";
import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { SalesView } from "./sales-view";

export const metadata = { title: "Sales — SellVia" };

export default async function SalesPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return (
    <Suspense>
      <SalesView email={session.email} />
    </Suspense>
  );
}
