import { NextResponse, type NextRequest } from "next/server"

import { isMockAuth } from "@/lib/ory/mock/config"
import { createMockFlow } from "@/lib/ory/mock/flows"
import { resolveMockSession } from "@/lib/ory/mock/client"
import type { FlowKind } from "@/lib/ory/flows"

const SUPPORTED: FlowKind[] = ["login", "registration", "recovery", "verification", "settings"]

// "settings" is the one authenticated flow kind — its page lives at
// /account/security (this repo's own routing), not /settings.
function pagePath(kind: FlowKind): string {
  return kind === "settings" ? "/account/security" : `/${kind}`
}

/**
 * Mock equivalent of Kratos's `/self-service/{kind}/browser` — creates a
 * flow and sends the browser to the page that renders it. Real target for
 * restartFlow() (lib/ory/flows.ts) when MOCK_AUTH=1; a no-op 404 otherwise
 * so this can't accidentally serve traffic in a real deployment.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  if (!isMockAuth()) return new NextResponse("Not found", { status: 404 })

  const { kind } = await params
  if (!SUPPORTED.includes(kind as FlowKind)) return new NextResponse("Unknown flow kind", { status: 400 })

  const returnTo = request.nextUrl.searchParams.get("return_to") ?? undefined
  const flowKind = kind as FlowKind

  if (flowKind === "settings") {
    const session = resolveMockSession(request.headers.get("cookie") ?? undefined)
    if (!session) return NextResponse.redirect(new URL(`/login?return_to=${encodeURIComponent("/account/security")}`, request.url))
    const flow = createMockFlow(flowKind, returnTo, session.userId)
    return NextResponse.redirect(new URL(`${pagePath(flowKind)}?flow=${flow.id}`, request.url))
  }

  const flow = createMockFlow(flowKind, returnTo)
  return NextResponse.redirect(new URL(`${pagePath(flowKind)}?flow=${flow.id}`, request.url))
}
