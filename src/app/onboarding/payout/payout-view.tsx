"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { OnboardingLayout } from "@/components/onboarding/onboarding-layout";
import { OnboardingNav } from "@/components/onboarding/onboarding-nav";
import { OnboardingSkeleton } from "@/components/onboarding/onboarding-skeleton";
import { RadioGroup } from "@/components/onboarding/radio-group";
import { useOnboardingStep } from "@/components/onboarding/use-onboarding-step";
import { Label } from "@/components/reference/ui/label";
import { Input } from "@/components/reference/ui/input";
import { Alert } from "@/components/reference/ui/alert";
import { FormErrorText } from "@/components/reference/ui/form-error-text";
import { savePayout } from "@/lib/onboarding/store";
import { payoutProviderAdapter } from "@/lib/onboarding/integrations/payout-provider";
import { STEP_PATH, stepBefore } from "@/lib/onboarding/steps";
import type { PayoutData } from "@/lib/onboarding/types";

const PAYOUT_METHODS = [
  { value: "bank", label: "Bank" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "easypaisa", label: "EasyPaisa" },
] as const;

/**
 * C4 — Switch payout setup. Dummy payout fields only — no real Bank/JazzCash/EasyPaisa
 * processing here (explicitly out of scope, and this is not a real payment provider
 * integration). Submitting a valid payout method also calls
 * lib/onboarding/integrations/payout-provider.ts's mock adapter, which is what
 * lib/onboarding/payout-gate.ts (the Feature-4-facing "are this creator's links activated?"
 * check) reads — so the blocking state below is a real, checkable status, not just copy.
 */
export function PayoutView({ email, sessionRoles }: { email: string; sessionRoles: string[] }) {
  const router = useRouter();
  const { record, ready, roles } = useOnboardingStep("payout", email, sessionRoles);

  const [method, setMethod] = useState<PayoutData["method"] | "">("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [mobileWalletNumber, setMobileWalletNumber] = useState("");
  const [mobileWalletAccountName, setMobileWalletAccountName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const isCreator = roles.includes("creator");

  useEffect(() => {
    if (record?.payout) {
      // Hydrating local form state from the async-loaded (client-only) saved record.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMethod(record.payout.method);
      setBankAccountName(record.payout.bankAccountName ?? "");
      setBankAccountNumber(record.payout.bankAccountNumber ?? "");
      setBankName(record.payout.bankName ?? "");
      setMobileWalletNumber(record.payout.mobileWalletNumber ?? "");
      setMobileWalletAccountName(record.payout.mobileWalletAccountName ?? "");
    }
  }, [record]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!method) {
      nextErrors.method = "Choose a payout method.";
    } else if (method === "bank") {
      if (bankAccountName.trim().length < 2) nextErrors.bankAccountName = "Enter the account holder name.";
      if (bankAccountNumber.trim().length < 4) nextErrors.bankAccountNumber = "Enter the account number.";
      if (bankName.trim().length < 2) nextErrors.bankName = "Enter the bank name.";
    } else if (method === "jazzcash" || method === "easypaisa") {
      if (mobileWalletAccountName.trim().length < 2) nextErrors.mobileWalletAccountName = "Enter the account holder name.";
      if (!/^\d{10,12}$/.test(mobileWalletNumber.trim())) nextErrors.mobileWalletNumber = "Enter a valid mobile wallet number.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    savePayout(email, {
      method: method as PayoutData["method"],
      ...(method === "bank"
        ? { bankAccountName: bankAccountName.trim(), bankAccountNumber: bankAccountNumber.trim(), bankName: bankName.trim() }
        : { mobileWalletAccountName: mobileWalletAccountName.trim(), mobileWalletNumber: mobileWalletNumber.trim() }),
    });
    await payoutProviderAdapter.connect(email);
    router.push(STEP_PATH.complete);
  }

  const back = stepBefore("payout", roles);

  return (
    <OnboardingLayout step="payout" roles={roles}>
      <div className="mb-5 space-y-1">
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">
          How should we pay you?
        </h1>
        <p className="text-sm text-muted-foreground">Add your payout details. You can update these later.</p>
      </div>

      {!ready ? (
        <OnboardingSkeleton />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {isCreator && (
            <Alert variant="info">
              Finish payout setup to activate your links. This is a dummy/mock payout setup for the MVP — no real
              payment provider is connected yet.
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label required>Payout method</Label>
            <RadioGroup
              name="payoutMethod"
              columns={3}
              value={method}
              onChange={(v) => setMethod(v as PayoutData["method"])}
              options={PAYOUT_METHODS as unknown as { value: string; label: string }[]}
            />
            {errors.method && <FormErrorText id="method-error">{errors.method}</FormErrorText>}
          </div>

          {method === "bank" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="bankAccountName" required>Account holder name</Label>
                <Input
                  id="bankAccountName"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  invalid={Boolean(errors.bankAccountName)}
                />
                {errors.bankAccountName && <FormErrorText id="bankAccountName-error">{errors.bankAccountName}</FormErrorText>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bankAccountNumber" required>Account number</Label>
                <Input
                  id="bankAccountNumber"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  invalid={Boolean(errors.bankAccountNumber)}
                />
                {errors.bankAccountNumber && <FormErrorText id="bankAccountNumber-error">{errors.bankAccountNumber}</FormErrorText>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bankName" required>Bank name</Label>
                <Input
                  id="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  invalid={Boolean(errors.bankName)}
                />
                {errors.bankName && <FormErrorText id="bankName-error">{errors.bankName}</FormErrorText>}
              </div>
            </div>
          )}

          {(method === "jazzcash" || method === "easypaisa") && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="mobileWalletAccountName" required>Account holder name</Label>
                <Input
                  id="mobileWalletAccountName"
                  value={mobileWalletAccountName}
                  onChange={(e) => setMobileWalletAccountName(e.target.value)}
                  invalid={Boolean(errors.mobileWalletAccountName)}
                />
                {errors.mobileWalletAccountName && (
                  <FormErrorText id="mobileWalletAccountName-error">{errors.mobileWalletAccountName}</FormErrorText>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mobileWalletNumber" required>
                  {method === "jazzcash" ? "JazzCash" : "EasyPaisa"} mobile number
                </Label>
                <Input
                  id="mobileWalletNumber"
                  type="tel"
                  placeholder="03XXXXXXXXX"
                  value={mobileWalletNumber}
                  onChange={(e) => setMobileWalletNumber(e.target.value)}
                  invalid={Boolean(errors.mobileWalletNumber)}
                />
                {errors.mobileWalletNumber && <FormErrorText id="mobileWalletNumber-error">{errors.mobileWalletNumber}</FormErrorText>}
              </div>
            </div>
          )}

          <OnboardingNav
            nextLabel="Complete setup"
            loading={submitting}
            onBack={back ? () => router.push(STEP_PATH[back]) : undefined}
          />
        </form>
      )}
    </OnboardingLayout>
  );
}
