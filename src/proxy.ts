import { NextResponse, type NextRequest } from "next/server"

import { getSessionFromCookieHeader } from "@/lib/auth/proxy-session"
import { getRolesHeld, type Role } from "@/lib/auth/role"
import { resolveFallbackHome, ACTIVE_CONTEXT_COOKIE } from "@/lib/auth/active-context"
import { ROLE_PREFIX } from "@/lib/nav/config"

// Next.js 16 renamed "middleware" to "proxy" (this file used to be
// middleware.ts) — see node_modules/next/dist/docs/.../file-conventions/proxy.md.
// Proxy defaults to the Node.js runtime already (good: @ory/client is
// axios-based and unreliable on Edge) — do NOT export `runtime` here, Next 16
// throws if you do.

// REDIRECT-LOOP FIX: /merchant/*, /creator/*, /admin/* used to be gated below
// through @/lib/ory/session — the *old*, disconnected session system (a raw
// Kratos toSession() call, unrelated to lib/auth/* and always null in mock
// mode). That produced an actual infinite loop: dashboard/page.tsx (current
// system) sends a merchant-role session to /merchant/overview -> this file
// (old system) saw no valid session and bounced to /login -> /login (current
// system) saw a valid session and bounced straight back to /dashboard ->
// back to /merchant/overview -> loop. Same fix already applied to /account/*
// (see git history) now applies here too: one session source
// (getSessionFromCookieHeader, lib/auth/proxy-session.ts) for every gate in
// this file, matching what every onboarding/dashboard guard already uses.
// lib/auth/role.ts and lib/auth/active-context.ts were updated alongside
// this to accept the current AppSession instead of the old Session type.
const PROTECTED: Array<{ prefix: string; role: Role }> = [
  { prefix: ROLE_PREFIX.merchant, role: "merchant" },
  { prefix: ROLE_PREFIX.creator, role: "creator" },
  { prefix: ROLE_PREFIX.admin, role: "admin" },
]

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/account")) {
    const session = await getSessionFromCookieHeader(request.headers.get("cookie") ?? "")
    if (!session) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("return_to", request.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  const match = PROTECTED.find((p) => request.nextUrl.pathname.startsWith(p.prefix))
  if (!match) return NextResponse.next()

  // Server-validated per request via the current auth seam — mock mode reads
  // the session cookie directly, kratos mode asks /sessions/whoami fresh
  // every time (see lib/auth/proxy-session.ts). Never throws (unlike the old
  // lib/ory/session it replaced here), so no separate catch/fail-closed
  // branch is needed — a misconfigured/unreachable provider just resolves to
  // `null`, same as "not logged in".
  const session = await getSessionFromCookieHeader(request.headers.get("cookie") ?? "")

  if (!session) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("return_to", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Membership, not exclusivity — an account can hold both merchant and
  // creator (task's own instruction), so this is "do they have this role"
  // not "is this their only/active role".
  if (!getRolesHeld(session).has(match.role)) {
    // Doesn't hold this section's role — send them to wherever they *do*
    // belong rather than a bare 403, and never confirm the route exists.
    const cookieValue = request.cookies.get(ACTIVE_CONTEXT_COOKIE)?.value
    return NextResponse.redirect(new URL(resolveFallbackHome(session, cookieValue), request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/merchant/:path*", "/creator/:path*", "/admin/:path*", "/account/:path*"],
}
