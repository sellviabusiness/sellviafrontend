import { CircleOff } from "lucide-react";
import { EmptyState } from "@/components/reference/ui/empty-state";

/**
 * Shared real-mode stand-in for the four admin screens with no real backend equivalent at all
 * (reconciliation, unit economics, AI usage, the AI-agent console) — confirmed, not just unbuilt.
 * Showing the mock's fake data here would be actively misleading, so this replaces it with an
 * honest "not available" state instead of silently continuing to render mock numbers.
 */
export function NotAvailableReal({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">{title}</h1>
      <EmptyState icon={<CircleOff className="h-5 w-5" aria-hidden="true" />} title="Not available yet" description={reason} />
    </div>
  );
}
