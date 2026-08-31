import { apiRequest } from "@/lib/api"
import type { CopyAssistContext, FitSummary } from "./types"

// Endpoint paths + request/response shapes are placeholders — unverified
// against AI Services / API-CONTRACT-SHEET (both unreachable). Isolated here
// so the real contract is a small swap once readable.
export async function draftCopy(context: CopyAssistContext): Promise<string> {
  const { text } = await apiRequest<{ text: string }>("/ai/copy-assist", {
    method: "POST",
    body: context,
  })
  return text
}

export async function getFitSummary(applicationId: string): Promise<FitSummary> {
  return apiRequest<FitSummary>(`/ai/applications/${applicationId}/fit-summary`)
}
