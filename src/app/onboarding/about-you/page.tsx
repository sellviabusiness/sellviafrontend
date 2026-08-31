import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { AboutYouView } from "./about-you-view";

export const metadata = { title: "Tell us about yourself — SellVia" };

export default async function AboutYouPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return <AboutYouView email={session.email} sessionRoles={session.roles} />;
}
