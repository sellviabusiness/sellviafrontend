import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { safeReturnTo } from "@/lib/auth/safe-return-to";
import { LoginView } from "./login-view";

export const metadata = { title: "Log in" };

// AUDIT FIX — same return_to gap as LoginView's own client-side redirect (see its doc comment):
// an already-authenticated visitor hitting /login?return_to=<path> (e.g. a stale bookmark, or a
// second tab) used to always bounce to /dashboard, dropping the path proxy.ts/the other
// server-side guards sent them here to reach. Same open-redirect guard as LoginView, via the
// same shared safeReturnTo (lib/auth/safe-return-to.ts) — only a same-origin relative path is
// honored, both were previously two separate copies of a check that had a real gap (see that
// file's own doc comment: the `/\` backslash-normalization bypass).
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string | string[] }>;
}) {
  const session = await getServerSession();
  if (session) redirect(safeReturnTo((await searchParams).return_to));

  return (
    <Suspense>
      <LoginView />
    </Suspense>
  );
}
