import { AxiosError } from "axios"
import { headers } from "next/headers"
import type { Session } from "@ory/client"

import { getOry } from "./sdk"

/**
 * Validates the session against Kratos on every call — toSession() hits
 * Kratos's /sessions/whoami fresh each time, no caching, no JWT decoding.
 * The cookie is opaque to us; Kratos is the only source of truth, per the
 * task's own instruction.
 *
 * Pass `cookieHeader` explicitly from middleware (which has no next/headers
 * access); omit it in Server Components/Actions/Route Handlers to read the
 * incoming request's cookie header automatically.
 */
export async function getSession(cookieHeader?: string): Promise<Session | null> {
  const cookie = cookieHeader ?? (await headers()).get("cookie") ?? undefined

  try {
    const { data } = await getOry().toSession({ cookie })
    return data
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 401) {
      return null
    }
    throw error
  }
}
