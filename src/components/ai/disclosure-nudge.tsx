import { InfoIcon } from "lucide-react"

// Fixed template — NOT AI/LLM-generated, per the task's own explicit
// instruction (this file has zero dependency on lib/ai). Wording is generic
// platform-level best practice, not a citation of any specific Pakistani
// advertising-disclosure regulation — I can't verify those without docs, so
// I'm not asserting them. Get this copy reviewed by whoever owns
// legal/compliance before it ships for real.
export function DisclosureNudge() {
  return (
    <div className="flex gap-2 rounded-lg border border-border bg-muted/50 p-3">
      <InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">Disclose this partnership</p>
        <p className="text-sm text-muted-foreground">
          This link earns you a commission. Wherever you share it, make that clear to your
          audience — e.g. &ldquo;Paid partnership&rdquo; or &ldquo;#ad&rdquo; alongside the post.
        </p>
      </div>
    </div>
  )
}
