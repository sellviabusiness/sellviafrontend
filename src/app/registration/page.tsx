import type { Metadata } from "next"

import { getOry } from "@/lib/ory/sdk"
import { restartFlow, requestCookie, isDeadFlowError } from "@/lib/ory/flows"
import { FlowForm } from "@/components/ory/flow-form"
import { DataDisclosureNotice } from "@/components/auth/data-disclosure-notice"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

// Transactional flow page, not a content page — noindex (see login/page.tsx).
export const metadata: Metadata = {
  title: "Create account",
  robots: { index: false, follow: false },
}

export default async function RegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ flow?: string; return_to?: string }>
}) {
  const { flow: flowId, return_to } = await searchParams

  if (!flowId) {
    restartFlow("registration", return_to)
  }

  let flow
  try {
    const cookie = await requestCookie()
    ;({ data: flow } = await getOry().getRegistrationFlow({ id: flowId, cookie }))
  } catch (error) {
    if (isDeadFlowError(error)) {
      restartFlow("registration", return_to)
    }
    throw error
  }

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle as="h1">Create account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Role selection (Merchant/Creator/both) renders automatically
              via FlowForm below IF Kratos's identity schema defines a
              traits.roles field — options-aware select support was added to
              flow-form.tsx for exactly this. Unverified whether that field
              exists on the actual schema (playbook open question 1); if it
              doesn't, no picker appears here and role assignment needs to
              happen another way (schema change, or a post-registration
              step) — not something this page can paper over. */}
          <DataDisclosureNotice />
          <FlowForm ui={flow.ui} />
        </CardContent>
      </Card>
    </main>
  )
}
