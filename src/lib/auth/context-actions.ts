"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { getServerSession } from "@/lib/auth/session"
import { getRolesHeld, SWITCHABLE_ROLES, type SwitchableRole } from "./role"
import { ROLE_PREFIX } from "@/lib/nav/config"
import { ACTIVE_CONTEXT_COOKIE } from "./active-context"

function isSwitchableRole(value: unknown): value is SwitchableRole {
  return typeof value === "string" && (SWITCHABLE_ROLES as readonly string[]).includes(value)
}

/**
 * Bound to the context-switcher form (see components/shell/context-switcher.tsx).
 *
 * REDIRECT-LOOP FIX: was reading the old, disconnected @/lib/ory/session (always null in mock
 * mode) — since a null session never holds any role, this silently no-op'd for every switch
 * attempt. Now reads the current session (lib/auth/session), same as every other guard.
 */
export async function switchContextAction(formData: FormData) {
  const requested = formData.get("role")
  if (!isSwitchableRole(requested)) return

  // Re-checked server-side — never trust the submitted role over what the
  // session actually holds, even though the switcher only ever renders
  // options the user holds in the first place.
  const session = await getServerSession()
  if (!getRolesHeld(session).has(requested)) return

  ;(await cookies()).set(ACTIVE_CONTEXT_COOKIE, requested, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  })
  redirect(ROLE_PREFIX[requested])
}
