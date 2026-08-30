import { NextResponse, type NextRequest } from "next/server"

import { isMockAuth } from "@/lib/ory/mock/config"
import { MOCK_SESSION_COOKIE } from "@/lib/ory/mock/client"
import { mockStore } from "@/lib/ory/mock/store"

/** Mock target for logoutAction()'s `data.logout_url` — clears the mock session and sends the browser to /login. */
export async function GET(request: NextRequest) {
  if (!isMockAuth()) return new NextResponse("Not found", { status: 404 })

  const token = request.cookies.get(MOCK_SESSION_COOKIE)?.value
  if (token) mockStore.sessions.delete(token)

  const response = NextResponse.redirect(new URL("/login", request.url))
  response.cookies.delete(MOCK_SESSION_COOKIE)
  return response
}
