"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { buttonVariants } from "@/components/reference/ui/button";

/**
 * BACKEND CONFIRMED LIVE — this used to be a "connect a billing method" screen backed by
 * OnboardingRecord.billingStatus (the same mock C2 concept the onboarding billing-connect step
 * used, since removed). Backend confirmed there's no such thing to connect: Switch bills per
 * cycle via an invoice, paid through Switch's own hosted checkout when it's due — nothing is
 * pre-registered or stored ahead of time, in mock or real mode. Rewritten as a plain informational
 * page pointing at where a cycle actually gets paid (/merchant/billing) rather than a status this
 * account can no longer have.
 */
export function BillingSettingsView() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href="/merchant/settings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Settings
      </Link>

      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Billing method</h1>
        <p className="text-sm text-muted-foreground">SellVia bills your account for commission owed each cycle.</p>
      </div>

      <Card className="space-y-3 p-6">
        <p className="text-sm text-foreground">
          There&apos;s no payment method to connect ahead of time — Switch sends an invoice each billing
          cycle, and you pay it (card, bank transfer, JazzCash, or EasyPaisa, chosen at checkout) through
          Switch&apos;s own hosted page when it&apos;s due.
        </p>
        <Link href="/merchant/billing" className={buttonVariants({ variant: "secondary", className: "w-full" })}>
          View billing cycles
        </Link>
      </Card>
    </div>
  );
}
