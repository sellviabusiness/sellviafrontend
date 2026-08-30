import type { AppSession } from "@/lib/auth/types"

import { ROLE_PREFIX } from "@/lib/nav/config"
import { getRolesHeld, resolveActiveRole } from "./role"

// Pure — no next/headers import. proxy.ts (Node.js Proxy/Middleware runtime)
// imports this directly; next/headers' cookies() only works in Server
// Components/Actions/Route Handlers, not Proxy, which reads cookies off
// NextRequest instead. Keeping this file cookie-API-free means proxy.ts
// can safely depend on it. The read helper for layouts lives in
// active-context-server.ts instead — the split exists to enforce that.
export const ACTIVE_CONTEXT_COOKIE = "sv_active_role"

/**
 * Where to send someone who hit a role-gated URL they don't have access to —
 * their last explicitly-chosen role if they still hold it, else whatever
 * they do hold, else login. Shared by proxy.ts and the three layouts so the
 * "wrong role → send them somewhere sane, don't leak the route exists"
 * fallback stays one behavior, not three.
 */
export function resolveFallbackHome(session: AppSession | null, cookieValue: string | undefined): string {
  const held = getRolesHeld(session)
  if (held.has("admin")) return ROLE_PREFIX.admin
  const active = resolveActiveRole(cookieValue, held)
  return active ? ROLE_PREFIX[active] : "/login"
}
