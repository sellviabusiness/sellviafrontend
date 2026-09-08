import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/auth/config";
import { VettingView } from "./vetting-view";
import { RealVettingView } from "./real-vetting-view";

export const metadata = { title: "Offer Vetting — SellVia Admin" };

export default async function VettingPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return isMockMode ? <VettingView actorEmail={session.email} /> : <RealVettingView />;
}
