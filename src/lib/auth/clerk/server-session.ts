import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { normalizeClerkUser } from "./normalize";
import type { AppSession } from "../types";

/**
 * Server-side session read for every page in this feature (redirect-if-authed on the auth
 * screens, redirect-if-not on the dashboard) — the Clerk-mode counterpart to
 * lib/auth/mock/server-session.ts. `currentUser()` reads Clerk's session cookie via
 * next/headers under the hood and re-validates it (Server Components only — Proxy uses
 * clerkClient().users.getUser() instead directly in proxy.ts, since next/headers isn't
 * available there; see proxy.ts's own comment on why).
 */
export async function getClerkServerSession(): Promise<AppSession | null> {
  const user = await currentUser();
  return user ? normalizeClerkUser(user) : null;
}
