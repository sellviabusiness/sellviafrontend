import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/auth/config";
import { RealWaitlistView } from "./real-waitlist-view";

export const metadata = { title: "Waitlist — SellVia Admin" };

// Real-only screen — no mock waitlist ever existed (see sidebar.tsx's doc comment). A direct hit
// on this URL in mock mode has nothing to render, so it bounces to the dashboard same as any
// other not-applicable route would.
export default async function WaitlistPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (isMockMode) redirect("/admin/dashboard");
  return <RealWaitlistView />;
}
