import { AUTH_MODE } from "./config";
import { MOCK_SESSION_COOKIE, parseMockSessionCookie } from "./mock/session-cookie";
import type { AppSession } from "./types";

// Deliberately not "server-only" and no next/headers import — this runs from src/proxy.ts,
// which is the Proxy/Middleware runtime, not a Server Component. next/headers' cookies() only
// works in the latter (a gotcha already hit once this session, see active-context-server.ts's
// own split for the same reason); Proxy reads cookies off NextRequest instead, so this takes the
// raw cookie header as a plain string rather than calling cookies() itself.
//
// Mock-mode only now — the real provider is Clerk, which reads its own session via
// clerkMiddleware()/auth() directly inside proxy.ts (see that file), not through this helper.
// This is what proxy.ts's mock branch calls to gate /account/*, /merchant/*, /creator/*,
// /admin/* against the exact same mock session lib/auth/mock/server-session.ts and every
// mock-mode Server Component already read.
export function getMockSessionFromCookieHeader(cookieHeader: string): AppSession | null {
  if (AUTH_MODE !== "mock") return null;
  const match = cookieHeader.match(new RegExp(`(?:^|; )${MOCK_SESSION_COOKIE}=([^;]*)`));
  return parseMockSessionCookie(match?.[1]);
}
