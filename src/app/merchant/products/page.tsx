import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { ProductsView } from "./products-view";

export const metadata = { title: "Products" };

export default async function ProductsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <ProductsView />;
}
