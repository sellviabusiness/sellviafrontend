import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { ForgotPasswordView } from "./forgot-password-view";

export const metadata = { title: "Reset your password — SellVia" };

export default async function ForgotPasswordPage() {
  const session = await getServerSession();
  if (session) redirect("/dashboard");

  return (
    <Suspense>
      <ForgotPasswordView />
    </Suspense>
  );
}
