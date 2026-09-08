"use client";

import { useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * D3/D4/D6's shared "here's the tracking link" display — one component so the copy interaction
 * behaves identically everywhere it shows up (Create/Edit Offer after publish, Offer detail,
 * and the approved creator's AffiliateLink on Application review).
 */
export function TrackingLinkBox({ url, label = "Tracking link" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API can be unavailable (permissions, non-secure context) — the link is still
      // selectable/readable in the box either way, so this fails silently rather than erroring.
    }
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-foreground/5 px-3 py-2">
        <Link2 className="h-4 w-4 shrink-0 text-muted-foreground-2" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-sm text-foreground">{url}</span>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            copied ? "border-success/30 text-success" : "text-foreground hover:border-border-hover",
          )}
        >
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
