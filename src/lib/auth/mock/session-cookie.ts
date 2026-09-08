import type { AppSession } from "../types";

/**
 * MOCK DATA LAYER — session transport.
 *
 * Stands in for: Kratos's own session cookie (`ory_kratos_session`), set by Kratos itself on
 * successful login/registration, read via `/sessions/whoami` — not a SellVia endpoint, and not
 * something this app will ever need to reimplement; the real path is
 * lib/auth/kratos/server-session.ts (Server Components) + lib/auth/proxy-session.ts (Proxy),
 * already built and already the real thing once NEXT_PUBLIC_AUTH_PROVIDER=kratos is set.
 *
 * DEV-ONLY MOCK COOKIE. Not httpOnly, not signed, not how a real session should ever be stored
 * — it exists purely so server components can gate routes (redirect-if-authed on /login,
 * redirect-if-not on /dashboard) against the mock provider exactly the same way they gate
 * against a real Kratos session, with zero backend involved. Deleted entirely once
 * NEXT_PUBLIC_AUTH_PROVIDER=kratos is set (lib/auth/kratos handles real sessions instead).
 */
export const MOCK_SESSION_COOKIE = "sellvia_mock_session";
const MAX_AGE_SECONDS = 60 * 60 * 24; // 24h — arbitrary, dev convenience only

export function setMockSessionCookie(session: AppSession) {
  if (typeof document === "undefined") return;
  document.cookie = `${MOCK_SESSION_COOKIE}=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax`;
}

export function clearMockSessionCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${MOCK_SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export function readMockSessionCookieClient(): AppSession | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${MOCK_SESSION_COOKIE}=([^;]*)`));
  return parseMockSessionCookie(match?.[1]);
}

export function parseMockSessionCookie(raw: string | undefined): AppSession | null {
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as AppSession;
  } catch {
    return null;
  }
}
