import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { VettingView } from "./vetting-view";

export const metadata = { title: "Offer Vetting — SellVia Admin" };

export default async function VettingPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <VettingView actorEmail={session.email} />;
}
