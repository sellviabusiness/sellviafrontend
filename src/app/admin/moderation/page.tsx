import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/auth/config";
import { ModerationView } from "./moderation-view";
import { RealModerationView } from "./real-moderation-view";

export const metadata = { title: "Moderation — SellVia Admin" };

export default async function ModerationPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return isMockMode ? <ModerationView actorEmail={session.email} /> : <RealModerationView />;
}
