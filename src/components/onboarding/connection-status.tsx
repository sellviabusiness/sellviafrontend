import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "@/lib/onboarding/types";

/**
 * Shared not_connected/connecting/connected/error indicator for every C2/C3/C4 integration
 * step — one small component instead of three near-identical status blocks per screen.
 */
export function ConnectionStatusBanner({
  status,
  notConnectedLabel,
  connectingLabel,
  connectedLabel,
  errorLabel,
}: {
  status: ConnectionStatus;
  notConnectedLabel: string;
  connectingLabel: string;
  connectedLabel: string;
  errorLabel?: string;
}) {
  const tone =
    status === "connected" ? "success" : status === "error" ? "error" : status === "connecting" ? "info" : "neutral";

  return (
    <div
      role={status === "error" ? "alert" : "status"}
      aria-live="polite"
      className={cn(
        "flex items-center gap-2.5 rounded-[var(--radius-sm)] border px-4 py-3 text-sm",
        tone === "success" && "border-success/30 bg-success/10 text-success",
        tone === "error" && "border-danger-border bg-danger-bg text-danger",
        tone === "info" && "border-border bg-foreground/5 text-muted-foreground",
        tone === "neutral" && "border-border text-muted-foreground",
      )}
    >
      {status === "connected" && <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />}
      {status === "connecting" && <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />}
      {status === "error" && <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />}
      <span>
        {status === "connected" && connectedLabel}
        {status === "connecting" && connectingLabel}
        {status === "error" && (errorLabel ?? "Something went wrong. Try again.")}
        {status === "not_connected" && notConnectedLabel}
      </span>
    </div>
  );
}
