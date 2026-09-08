import { NextResponse, type NextRequest } from "next/server"
import { clerkMiddleware, clerkClient } from "@clerk/nextjs/server"

import { AUTH_MODE } from "@/lib/auth/config"
import { getMockSessionFromCookieHeader } from "@/lib/auth/proxy-session"
import { normalizeClerkUser } from "@/lib/auth/clerk/normalize"
import { getRolesHeld, type Role } from "@/lib/auth/role"
import { resolveFallbackHome, ACTIVE_CONTEXT_COOKIE } from "@/lib/auth/active-context"
import { ROLE_PREFIX } from "@/lib/nav/config"
import type { AppSession } from "@/lib/auth/types"

// Next.js 16 renamed "middleware" to "proxy" (this file used to be
// middleware.ts) — see node_modules/next/dist/docs/.../file-conventions/proxy.md.
// Proxy defaults to the Node.js runtime already (good: clerkMiddleware and
// clerkClient() need it) — do NOT export `runtime` here, Next 16 throws if
// you do.

// REDIRECT-LOOP FIX (still relevant, now against Clerk too): every gate below reads the ONE
// current session source for whichever provider is active (lib/auth/config.ts) — mock mode via
// the cookie directly, clerk mode via Clerk's own request-bound auth — never a second,
// disconnected session system. See git history for the original bug this fixed against the old
// (now-deleted) lib/ory/session.
const PROTECTED: Array<{ prefix: string; role: Role }> = [
  { prefix: ROLE_PREFIX.merchant, role: "merchant" },
  { prefix: ROLE_PREFIX.creator, role: "creator" },
  { prefix: ROLE_PREFIX.admin, role: "admin" },
]

type GateMatch = "account" | { role: Role }

/** Whether `pathname` is one this file actually gates at all — /account (any session) or one of
 *  PROTECTED's role-specific prefixes. Checked before doing any session lookup: the matcher
 *  below runs on nearly every request (see its own doc comment), and most of those paths need
 *  no gating, so there's no reason to pay for a session lookup on them. */
function matchGate(pathname: string): GateMatch | null {
  if (pathname.startsWith("/account")) return "account"
  const match = PROTECTED.find((p) => pathname.startsWith(p.prefix))
  return match ? { role: match.role } : null
}

/**
 * The actual routing logic, shared by both providers below — everything from here down only
 * cares about "is there a session, and what roles does it hold", not which provider produced it.
 */
function gate(match: GateMatch, session: AppSession | null, request: NextRequest): NextResponse {
  if (!session) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("return_to", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (match === "account") return NextResponse.next()

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

async function mockProxy(request: NextRequest): Promise<NextResponse> {
  const match = matchGate(request.nextUrl.pathname)
  if (!match) return NextResponse.next()
  const session = getMockSessionFromCookieHeader(request.headers.get("cookie") ?? "")
  return gate(match, session, request)
}

// clerkMiddleware() is only ever constructed when AUTH_MODE is actually "clerk" (see the export
// below) — calling it unconditionally at module scope would mean every mock-mode request (the
// default, zero-real-environment case) eagerly touches Clerk's own env-var validation even
// though nothing here uses it.
//
// Per-request clerkClient().users.getUser() (rather than trusting auth()'s sessionClaims, which
// only carry whatever the Clerk Dashboard's session-token template is configured to include) —
// same reasoning lib/auth/kratos/server-session.ts used to document for Kratos's
// /sessions/whoami: server-validated fresh, not a cached/JWT-only claim that could go stale or
// silently omit fields no Dashboard config was ever confirmed to add. Only actually done for a
// matchGate()-hit path, not every request — clerkMiddleware still ran either way (that alone is
// what makes auth()/currentUser() work later on, in Server Components/Actions), this just skips
// the extra network round trip to Clerk's API on the large majority of requests that don't need it.
function buildClerkProxy() {
  return clerkMiddleware(async (auth, request) => {
    const match = matchGate(request.nextUrl.pathname)
    if (!match) return NextResponse.next()

    const { userId } = await auth()
    if (!userId) return gate(match, null, request)

    try {
      const user = await (await clerkClient()).users.getUser(userId)
      return gate(match, normalizeClerkUser(user), request)
    } catch {
      // Clerk unreachable/user lookup failed — treat as "no session" rather than throwing, same
      // fail-closed-to-"logged-out" behavior the mock/kratos paths already had.
      return gate(match, null, request)
    }
  })
}

export default AUTH_MODE === "clerk" ? buildClerkProxy() : mockProxy

export const config = {
  // Broad on purpose (Clerk's own recommended default, see
  // node_modules/next/dist/docs/.../file-conventions/proxy.md and Clerk's clerk-middleware
  // docs) rather than just the four PROTECTED/`/account` prefixes: clerkMiddleware has to run on
  // a request before `auth()`/`currentUser()` elsewhere (Server Components, Server Actions) can
  // see that request's session at all. `gate()` above still only actually redirects on the four
  // gated prefixes — everything else falls through to NextResponse.next() unchanged, so this is
  // safe for mock mode too (a few extra no-op invocations, no behavior change).
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
