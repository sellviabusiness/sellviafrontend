"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { Label } from "@/components/reference/ui/label";
import { Input } from "@/components/reference/ui/input";
import { Alert } from "@/components/reference/ui/alert";
import { FormErrorText } from "@/components/reference/ui/form-error-text";
import { getPayoutMethod, updatePayoutMethod } from "@/lib/creator/real-store";
import { ApiError } from "@/lib/api";

/**
 * Real-mode counterpart to payout-settings-view.tsx. The mock's version was a fake "Connect"
 * button with no real fields at all — this is the real thing: an actual form, wired to
 * GET/PATCH /users/creator-profile/payout-method. Raw account numbers are sent but never stored
 * anywhere in SellVia's own database (forwarded to a fake-for-now Swich adapter, discarded) —
 * same principle as card details.
 *
 * PRODUCT DECISION — bank transfer only (JazzCash/EasyPaisa dropped): only one method exists now,
 * so there's nothing to pick between — just the bank fields, no radio group.
 */
export function RealPayoutSettingsView() {
  const [ready, setReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const state = await getPayoutMethod();
        setConnected(state.connected);
        setShowForm(!state.connected);
      } catch (err) {
        setLoadError(err instanceof ApiError ? err.uiMessage : "Couldn't load your payout method.");
        setShowForm(true);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (bankAccountName.trim().length < 2) nextErrors.bankAccountName = "Enter the account holder name.";
    if (bankAccountNumber.trim().length < 4) nextErrors.bankAccountNumber = "Enter the account number.";
    if (bankName.trim().length < 2) nextErrors.bankName = "Enter the bank name.";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setSubmitError(null);
    setSubmitting(true);
    (async () => {
      try {
        const result = await updatePayoutMethod({
          method: "bank_transfer",
          bankAccountName: bankAccountName.trim(),
          bankAccountNumber: bankAccountNumber.trim(),
          bankName: bankName.trim(),
        });
        setConnected(result.connected);
        setShowForm(false);
      } catch (err) {
        setSubmitError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
      } finally {
        setSubmitting(false);
      }
    })();
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href="/creator/settings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Settings
      </Link>

      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Payout method</h1>
        <p className="text-sm text-muted-foreground">SellVia pays your commission to this bank account each cycle.</p>
      </div>

      {loadError && <Alert variant="error">{loadError}</Alert>}

      {connected && !showForm ? (
        <Card className="space-y-4 p-6">
          <Alert variant="success">Connected — paying out via bank transfer.</Alert>
          <Button variant="secondary" className="w-full" onClick={() => setShowForm(true)}>
            Change bank account
          </Button>
        </Card>
      ) : (
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {submitError && <Alert variant="error">{submitError}</Alert>}

            <div className="space-y-1.5">
              <Label htmlFor="bankAccountName" required>Account holder name</Label>
              <Input id="bankAccountName" value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} invalid={Boolean(errors.bankAccountName)} />
              {errors.bankAccountName && <FormErrorText id="bankAccountName-error">{errors.bankAccountName}</FormErrorText>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bankAccountNumber" required>Account number</Label>
              <Input id="bankAccountNumber" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} invalid={Boolean(errors.bankAccountNumber)} />
              {errors.bankAccountNumber && <FormErrorText id="bankAccountNumber-error">{errors.bankAccountNumber}</FormErrorText>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bankName" required>Bank name</Label>
              <Input id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} invalid={Boolean(errors.bankName)} />
              {errors.bankName && <FormErrorText id="bankName-error">{errors.bankName}</FormErrorText>}
            </div>

            <Button type="submit" className="w-full" loading={submitting}>
              {connected ? "Update bank account" : "Save bank account"}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
