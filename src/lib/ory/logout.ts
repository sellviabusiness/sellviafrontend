"use server"

import { redirect } from "next/navigation"

import { requestCookie } from "./flows"
import { getOry } from "./sdk"

/**
 * Server Action for a logout <form>. Fetches a one-time logout URL from
 * Kratos (createBrowserLogoutFlow) rather than hardcoding one — the token
 * it embeds is single-use and tied to the current session, so it can't be
 * precomputed or linked to directly.
 */
export async function logoutAction() {
  const cookie = await requestCookie()
  const { data } = await getOry().createBrowserLogoutFlow({ cookie })
  redirect(data.logout_url)
}
