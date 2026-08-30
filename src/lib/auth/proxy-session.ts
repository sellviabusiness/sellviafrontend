import type { Session } from "@ory/client";
import { AUTH_MODE } from "./config";
import { ORY_KRATOS_URL, normalizeKratosSession } from "./kratos/sdk";
import { MOCK_SESSION_COOKIE, parseMockSessionCookie } from "./mock/session-cookie";
import type { AppSession } from "./types";

// Deliberately not "server-only" and no next/headers import — this runs from src/proxy.ts,
// which is the Proxy/Middleware runtime, not a Server Component. next/headers' cookies() only
// works in the latter (a gotcha already hit once this session, see active-context-server.ts's
// own split for the same reason); Proxy reads cookies off NextRequest instead, so this takes the
// raw cookie header as a plain string rather than calling cookies() itself.
//
// This is the fix for the real bug the audit found: src/proxy.ts was gating /account/* with the
// *old* @/lib/ory/session (a different, disconnected auth system, and one that throws when
// ORY_SDK_URL isn't set) — meaning /account/security was unreachable regardless of whether the
// *current* auth system's session was valid. This is what proxy.ts should have been calling.
export async function getSessionFromCookieHeader(cookieHeader: string): Promise<AppSession | null> {
  if (AUTH_MODE === "mock") {
    const match = cookieHeader.match(new RegExp(`(?:^|; )${MOCK_SESSION_COOKIE}=([^;]*)`));
    return parseMockSessionCookie(match?.[1]);
  }

  if (!ORY_KRATOS_URL) return null;
  try {
    const res = await fetch(`${ORY_KRATOS_URL}/sessions/whoami`, {
      headers: { Accept: "application/json", Cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return normalizeKratosSession((await res.json()) as Session);
  } catch {
    return null;
  }
}
