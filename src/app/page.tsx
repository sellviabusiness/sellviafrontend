import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";

/**
 * Root path is a pure redirect, no public marketing content (A1-A4 removed — Playbook 08 was
 * reverted). No session -> /register (the only entry point now). A session exists -> /dashboard,
 * which already owns the real onboarding-gate + role-based redirect chain (merchant/creator/
 * admin) — reused here rather than duplicated.
 */
export default async function RootPage() {
  const session = await getServerSession();
  redirect(session ? "/dashboard" : "/register");
}
