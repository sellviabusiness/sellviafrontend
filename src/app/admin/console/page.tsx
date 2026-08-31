import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { ConsoleView } from "./console-view";

export const metadata = { title: "AI Console — SellVia Admin" };

export default async function AdminConsolePage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <ConsoleView actorEmail={session.email} />;
}
