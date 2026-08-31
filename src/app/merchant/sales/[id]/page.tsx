import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { SaleDetailView } from "./sale-detail-view";

export const metadata = { title: "Sale receipt — SellVia" };

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const { id } = await params;
  return <SaleDetailView email={session.email} saleId={id} />;
}
