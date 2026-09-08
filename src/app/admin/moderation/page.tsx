import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { ModerationView } from "./moderation-view";

export const metadata = { title: "Moderation — SellVia Admin" };

export default async function ModerationPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <ModerationView actorEmail={session.email} />;
}
