import { NextResponse, type NextRequest } from "next/server"

import { isMockAuth } from "@/lib/ory/mock/config"
import { submitMockFlow } from "@/lib/ory/mock/flows"
import { MOCK_SESSION_COOKIE, resolveMockSession } from "@/lib/ory/mock/client"
import type { FlowKind } from "@/lib/ory/flows"

const SUPPORTED: FlowKind[] = ["login", "registration", "recovery", "verification", "settings"]

/**
 * Mock equivalent of Kratos's flow submission endpoint (`ui.action` on every
 * mock flow points here) — native HTML form POST, full-page redirect
 * response, exactly the same contract flow-form.tsx/the four page.tsx files
 * already assume for the real Kratos case.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  if (!isMockAuth()) return new NextResponse("Not found", { status: 404 })

  const { kind } = await params
  if (!SUPPORTED.includes(kind as FlowKind)) return new NextResponse("Unknown flow kind", { status: 400 })

  const flowId = request.nextUrl.searchParams.get("flow")
  if (!flowId) return new NextResponse("Missing flow id", { status: 400 })

  const form = await request.formData()
  const body: Record<string, string> = {}
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") body[key] = value
  }

  const currentSession = resolveMockSession(request.headers.get("cookie") ?? undefined)
  const result = submitMockFlow(kind as FlowKind, flowId, body, currentSession)
  const response = NextResponse.redirect(new URL(result.location, request.url), 303)
  if (result.kind === "redirect" && result.setSessionCookie) {
    response.cookies.set(MOCK_SESSION_COOKIE, result.setSessionCookie, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14, // 14-day ceiling, matching the real session model (Docs/Security/Session Management)
    })
  }
  return response
}
