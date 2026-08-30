import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { RegisterView } from "./register-view";

export const metadata = { title: "Create account — SellVia" };

export default async function RegisterPage() {
  const session = await getServerSession();
  if (session) redirect("/dashboard");

  return (
    <Suspense>
      <RegisterView />
    </Suspense>
  );
}
