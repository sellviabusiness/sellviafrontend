"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { OnboardingLayout } from "@/components/onboarding/onboarding-layout";
import { OnboardingNav } from "@/components/onboarding/onboarding-nav";
import { OnboardingSkeleton } from "@/components/onboarding/onboarding-skeleton";
import { useOnboardingStep } from "@/components/onboarding/use-onboarding-step";
import { Label } from "@/components/reference/ui/label";
import { Input } from "@/components/reference/ui/input";
import { FormErrorText } from "@/components/reference/ui/form-error-text";
import { saveCommonProfile } from "@/lib/onboarding/store";
import { STEP_PATH, stepAfter, stepBefore } from "@/lib/onboarding/steps";
import type { CommonProfile } from "@/lib/onboarding/types";

const PHONE_PATTERN = /^[+\d][\d\s()-]{6,}$/;

/** Asked once regardless of role count (see steps.ts design-decision note) — collected here
 *  first, then reused for both the Merchant and Creator phases of a dual-role run. */
export function AboutYouView({ email, sessionRoles }: { email: string; sessionRoles: string[] }) {
  const router = useRouter();
  const { record, ready, roles } = useOnboardingStep("about-you", email, sessionRoles);

  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof CommonProfile, string>>>({});

  useEffect(() => {
    if (record?.commonProfile) {
      // Hydrating local form state from the async-loaded (client-only) saved record.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFullName(record.commonProfile.fullName);
      setCountry(record.commonProfile.country);
      setPhone(record.commonProfile.phone);
    }
  }, [record]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (fullName.trim().length < 2) nextErrors.fullName = "Enter your full name.";
    if (country.trim().length < 2) nextErrors.country = "Enter your country.";
    if (!PHONE_PATTERN.test(phone.trim())) nextErrors.phone = "Enter a valid phone number.";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    saveCommonProfile(email, { fullName: fullName.trim(), email, country: country.trim(), phone: phone.trim() });
    const next = stepAfter("about-you", roles) ?? "payout";
    router.push(STEP_PATH[next]);
  }

  const back = stepBefore("about-you", roles);
  const isCreatorOnly = roles.includes("creator") && !roles.includes("merchant");
  const subtitle = isCreatorOnly
    ? "Help us understand you as a creator."
    : "Let's start with a few details about you.";

  return (
    <OnboardingLayout step="about-you" roles={roles}>
      <div className="mb-5 space-y-1">
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">
          Tell us about yourself
        </h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {!ready ? (
        <OnboardingSkeleton />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="fullName" required>Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              invalid={Boolean(errors.fullName)}
              autoComplete="name"
            />
            {errors.fullName && <FormErrorText id="fullName-error">{errors.fullName}</FormErrorText>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled autoComplete="email" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" required>Phone number</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              invalid={Boolean(errors.phone)}
              autoComplete="tel"
            />
            {errors.phone && <FormErrorText id="phone-error">{errors.phone}</FormErrorText>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="country" required>Country</Label>
            <Input
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              invalid={Boolean(errors.country)}
              autoComplete="country-name"
            />
            {errors.country && <FormErrorText id="country-error">{errors.country}</FormErrorText>}
          </div>

          <OnboardingNav onBack={back ? () => router.push(STEP_PATH[back]) : undefined} />
        </form>
      )}
    </OnboardingLayout>
  );
}
