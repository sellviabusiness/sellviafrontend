import "server-only";
import { cookies } from "next/headers";
import { ONBOARDING_COMPLETE_COOKIE } from "./status-cookie";
import type { AppSession } from "@/lib/auth/types";

/**
 * Server-side gate: is *this* authenticated account's onboarding complete?
 *
 * Prefers the session itself (AppSession.onboardingComplete — real for the mock provider,
 * best-effort for kratos, see lib/auth/types.ts's AuthProvider doc comment) over the
 * side-channel cookie, which is now a fallback rather than the primary source: kratos mode has
 * no confirmed write path for a session-native flag yet, so it keeps working off the cookie
 * until that exists. Checked with `!== undefined`, not truthiness, so a *real* `false` (mock
 * mode, onboarding genuinely incomplete) is trusted instead of silently falling through to the
 * cookie.
 */
export async function isOnboardingComplete(session: AppSession): Promise<boolean> {
  if (session.onboardingComplete !== undefined) return session.onboardingComplete;

  const store = await cookies();
  const raw = store.get(ONBOARDING_COMPLETE_COOKIE)?.value;
  if (!raw) return false;
  return decodeURIComponent(raw).toLowerCase() === session.email.toLowerCase();
}
