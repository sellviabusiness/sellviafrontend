import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/auth/config";
import { SaleDetailView } from "./sale-detail-view";
import { RealSaleDetailView } from "./real-sale-detail-view";

export const metadata = { title: "Sale receipt" };

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const { id } = await params;
  return isMockMode ? <SaleDetailView email={session.email} saleId={id} /> : <RealSaleDetailView saleId={id} />;
}
