import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { BusinessView } from "./business-view";

export const metadata = { title: "Tell us about your business — SellVia" };

export default async function BusinessPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return <BusinessView email={session.email} sessionRoles={session.roles} />;
}
