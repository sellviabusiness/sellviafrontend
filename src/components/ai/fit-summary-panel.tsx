import { SparklesIcon } from "lucide-react"

import { getFitSummary } from "@/lib/ai/api"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

/**
 * AI-generated, unlike disclosure-nudge.tsx — labeled per the same
 * "review before using" convention as CopyAssistButton. Degrades to nothing
 * (not an error banner) on failure: a missing fit summary isn't a broken
 * page, the application itself still needs to render around it.
 */
export async function FitSummaryPanel({ applicationId }: { applicationId: string }) {
  let summary: string
  try {
    summary = (await getFitSummary(applicationId)).summary
  } catch (error) {
    console.error("[ai] fit-summary fetch failed:", error)
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <SparklesIcon className="size-4 text-primary" aria-hidden="true" />
          Fit summary
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-sm text-foreground">{summary}</p>
        <p className="text-xs text-muted-foreground">AI-generated — review before deciding.</p>
      </CardContent>
    </Card>
  )
}
