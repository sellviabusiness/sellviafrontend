import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { LoginView } from "./login-view";

export const metadata = { title: "Log in — SellVia" };

export default async function LoginPage() {
  const session = await getServerSession();
  if (session) redirect("/dashboard");

  return (
    <Suspense>
      <LoginView />
    </Suspense>
  );
}
