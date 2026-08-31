import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { MyLinksView } from "./my-links-view";

export const metadata = { title: "My Links — SellVia" };

export default async function CreatorMyLinksPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return <MyLinksView email={session.email} />;
}
