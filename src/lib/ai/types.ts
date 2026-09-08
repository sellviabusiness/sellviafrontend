// Unverified against AI Services doc / API-CONTRACT-SHEET (both unreachable:
// private submodule, no bypass secret). Shapes are placeholders, isolated to
// this file and api.ts so the real contract is a small swap once readable.

export interface CopyAssistContext {
  /** What kind of copy this is for. Placeholder enum — extend as real fields need drafting. */
  field: "offer_description" | "application_message"
  /** Whatever the model needs as context — existing draft text, offer title, etc. Placeholder: free-form. */
  prompt: string
}

export interface FitSummary {
  summary: string
  generatedAt: string
}
