import type { Metadata } from "next"

import { getOry } from "@/lib/ory/sdk"
import { restartFlow, requestCookie, isDeadFlowError } from "@/lib/ory/flows"
import { FlowForm } from "@/components/ory/flow-form"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

// Transactional flow page, not a content page — noindex (see login/page.tsx).
export const metadata: Metadata = {
  title: "Verify email",
  robots: { index: false, follow: false },
}

export default async function VerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ flow?: string; return_to?: string }>
}) {
  const { flow: flowId, return_to } = await searchParams

  if (!flowId) {
    restartFlow("verification", return_to)
  }

  let flow
  try {
    const cookie = await requestCookie()
    ;({ data: flow } = await getOry().getVerificationFlow({ id: flowId, cookie }))
  } catch (error) {
    if (isDeadFlowError(error)) {
      restartFlow("verification", return_to)
    }
    throw error
  }

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle as="h1">Verify email</CardTitle>
        </CardHeader>
        <CardContent>
          <FlowForm ui={flow.ui} />
        </CardContent>
      </Card>
    </main>
  )
}
