import type { Metadata } from "next"

import { getOry } from "@/lib/ory/sdk"
import { restartFlow, requestCookie, isDeadFlowError } from "@/lib/ory/flows"
import { FlowForm } from "@/components/ory/flow-form"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

// Transactional flow page, not a content page — noindex (see login/page.tsx).
export const metadata: Metadata = {
  title: "Recover account",
  robots: { index: false, follow: false },
}

export default async function RecoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ flow?: string; return_to?: string }>
}) {
  const { flow: flowId, return_to } = await searchParams

  if (!flowId) {
    restartFlow("recovery", return_to)
  }

  let flow
  try {
    const cookie = await requestCookie()
    ;({ data: flow } = await getOry().getRecoveryFlow({ id: flowId, cookie }))
  } catch (error) {
    if (isDeadFlowError(error)) {
      restartFlow("recovery", return_to)
    }
    throw error
  }

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle as="h1">Recover account</CardTitle>
          {/* B3's own requirement ("logs out other sessions"). Shown
              unconditionally rather than gated on RecoveryFlow.state
              (choose_method/sent_email/passed_challenge) — Kratos's own SDK
              marks that field "EXPERIMENTAL, subject to change", not worth a
              fragile dependency for a one-line notice. Whether this Kratos
              instance actually has the revoke-on-recovery behavior enabled
              is unverified server-side config (playbook open question 6) —
              this states Ory's documented default, not a guarantee. */}
          <CardDescription>
            Resetting your password signs you out everywhere else it&apos;s currently in use.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FlowForm ui={flow.ui} />
        </CardContent>
      </Card>
    </main>
  )
}
