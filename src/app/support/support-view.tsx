"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, HelpCircle } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Label } from "@/components/reference/ui/label";
import { Input } from "@/components/reference/ui/input";
import { Textarea } from "@/components/reference/ui/textarea";
import { Button } from "@/components/reference/ui/button";
import { SellViaLogo } from "@/components/reference/brand/sellvia-logo";
import { submitSupportMessage } from "@/lib/support/store";

/**
 * Playbook 06 F3 — a contact form that logs to a mock store (lib/support/store.ts), not a real
 * email/ticketing integration. The payout-timing note below deliberately references D9's real
 * billing-cycle mechanism (open → pending_charge → charged/failed) rather than quoting an
 * invented settlement-window day-count — per your explicit decision, since no real number exists
 * anywhere in this codebase's docs.
 */
export function SupportView({ email }: { email: string }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (subject.trim().length < 3) nextErrors.subject = "Enter a short subject.";
    if (message.trim().length < 10) nextErrors.message = "Add a few more details (10+ characters).";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    submitSupportMessage(email, subject, message);
    setSubmitted(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 sm:px-6">
      <div className="w-full max-w-lg space-y-5">
        <SellViaLogo />

        <Card className="p-6 sm:p-7">
          <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Support</h1>
          <p className="mt-1 text-sm text-muted-foreground">Have a question or ran into a problem? Send us a note.</p>

          <div className="mt-4 flex gap-2 rounded-[var(--radius-sm)] border border-border bg-foreground/5 p-3">
            <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Waiting on a payout?</span> That&apos;s expected, not a failure — payouts
              follow your billing cycle status (open → pending charge → charged), visible any time on your Billing or Earnings page. A
              cycle that&apos;s still open or pending simply hasn&apos;t settled yet.
            </p>
          </div>

          {submitted ? (
            <div className="mt-5 flex flex-col items-center gap-2 rounded-[var(--radius-sm)] border border-success/30 bg-success/10 p-5 text-center">
              <CheckCircle2 className="h-6 w-6 text-success" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">We&apos;ve received your message.</p>
              <p className="text-xs text-muted-foreground">Typical response time is 1–2 business days.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="email">Your email</Label>
                <Input id="email" value={email} disabled />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subject" required>Subject</Label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} invalid={Boolean(errors.subject)} />
                {errors.subject && <p className="text-xs text-danger">{errors.subject}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="message" required>Message</Label>
                <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} invalid={Boolean(errors.message)} />
                {errors.message && <p className="text-xs text-danger">{errors.message}</p>}
              </div>
              <Button type="submit" className="w-full">Send message</Button>
            </form>
          )}
        </Card>

        <p className="text-center text-sm">
          <Link href="/dashboard" className="text-muted-foreground underline underline-offset-2 hover:text-foreground">
            Back to dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
