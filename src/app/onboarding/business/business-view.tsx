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
import { Select } from "@/components/reference/ui/select";
import { Alert } from "@/components/reference/ui/alert";
import { FormErrorText } from "@/components/reference/ui/form-error-text";
import { saveMerchantDetails } from "@/lib/onboarding/store";
import { STEP_PATH, stepAfter, stepBefore } from "@/lib/onboarding/steps";
import type { MerchantDetails } from "@/lib/onboarding/types";
import { isMockMode } from "@/lib/auth/config";
import { apiRequest, ApiError } from "@/lib/api";

const BUSINESS_CATEGORIES = [
  "Beauty",
  "Fashion",
  "Electronics",
  "Digital Products",
  "Food & Beverage",
  "Health & Wellness",
  "Home & Lifestyle",
  "Other",
];

const PRODUCT_TYPES = [
  { value: "physical", label: "Physical products" },
  { value: "digital", label: "Digital products" },
] as const;

/** Real URL parsing (not a regex) — rejects anything the browser itself wouldn't treat as a
 *  navigable http(s) URL, e.g. "https://" alone or a bare word with no host. */
function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

export function BusinessView({ email, id, sessionRoles }: { email: string; id: string; sessionRoles: string[] }) {
  const router = useRouter();
  const { record, ready, roles } = useOnboardingStep("business", email, id, sessionRoles);

  const [businessName, setBusinessName] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");
  const [productType, setProductType] = useState<MerchantDetails["productType"] | "">("");
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (record?.merchant) {
      // Hydrating local form state from the async-loaded (client-only) saved record.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBusinessName(record.merchant.businessName);
      setBusinessCategory(record.merchant.businessCategory);
      setProductType(record.merchant.productType);
      setWebsite(record.merchant.website);
    }
  }, [record]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setApiError(null);
    const nextErrors: Record<string, string> = {};
    if (businessName.trim().length < 2) nextErrors.businessName = "Enter your business or brand name.";
    if (!businessCategory) nextErrors.businessCategory = "Choose a business category.";
    if (!productType) nextErrors.productType = "Choose what you sell.";
    if (!website.trim()) {
      nextErrors.website = "Enter your website URL.";
    } else if (!isValidUrl(website.trim())) {
      nextErrors.website = "Enter a valid URL (e.g. https://example.com).";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    saveMerchantDetails(email, {
      businessName: businessName.trim(),
      businessCategory,
      productType: productType as MerchantDetails["productType"],
      website: website.trim(),
    });

    if (!isMockMode) {
      // Per the backend integration thread: POST /users/merchant-profile is the real signal the
      // backend gates merchant access on (is_merchant), not anything written to Clerk. `name`
      // isn't derivable from Clerk server-side, so it rides along from the about-you step
      // (already saved to `record` by the time this step is reachable — about-you always comes
      // first, see steps.ts's getStepSequence). `category` here is this app's `productType`
      // (physical/digital), distinct from `businessCategory` (the vertical picker below) —
      // both now accepted (businessCategory + website added to MerchantProfileCreate, backend
      // migration 202609040001_onboarding_extra_fields.py) after previously being silently
      // dropped; both optional, so still safe to send even if a field name turns out wrong.
      setSubmitting(true);
      try {
        await apiRequest("/users/merchant-profile", {
          method: "POST",
          body: {
            name: record?.commonProfile?.fullName ?? "",
            businessName: businessName.trim(),
            category: productType,
            businessCategory,
            website: website.trim(),
          },
        });
      } catch (err) {
        // 409 ALREADY_A_MERCHANT — idempotent, this account already has the profile Clerk's
        // own metadata (or a page refresh mid-onboarding) may not know about yet. Not a failure.
        if (!(err instanceof ApiError && err.code === "ALREADY_A_MERCHANT")) {
          setSubmitting(false);
          setApiError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
          return;
        }
      }
      setSubmitting(false);
    }

    const next = stepAfter("business", roles) ?? "payout";
    router.push(STEP_PATH[next]);
  }

  const back = stepBefore("business", roles);

  return (
    <OnboardingLayout step="business" roles={roles}>
      <div className="mb-5 space-y-1">
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">
          Tell us about your business
        </h1>
        <p className="text-sm text-muted-foreground">Help us understand what you sell.</p>
      </div>

      {!ready ? (
        <OnboardingSkeleton />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {apiError && <Alert variant="error">{apiError}</Alert>}
          <div className="space-y-1.5">
            <Label htmlFor="businessName" required>Business / brand name</Label>
            <Input
              id="businessName"
              placeholder="e.g. Glow Beauty"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              invalid={Boolean(errors.businessName)}
            />
            {errors.businessName && <FormErrorText id="businessName-error">{errors.businessName}</FormErrorText>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="businessCategory" required>Business category</Label>
            <Select
              id="businessCategory"
              value={businessCategory}
              onChange={(e) => setBusinessCategory(e.target.value)}
              invalid={Boolean(errors.businessCategory)}
            >
              <option value="" disabled>Select one</option>
              {BUSINESS_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Select>
            {errors.businessCategory && <FormErrorText id="businessCategory-error">{errors.businessCategory}</FormErrorText>}
          </div>

          <div className="space-y-1.5">
            <Label required>Product type</Label>
            <RadioGroup
              name="productType"
              columns={2}
              value={productType}
              onChange={(v) => setProductType(v as MerchantDetails["productType"])}
              options={PRODUCT_TYPES as unknown as { value: string; label: string }[]}
            />
            {errors.productType && <FormErrorText id="productType-error">{errors.productType}</FormErrorText>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="website" required>Website</Label>
            <Input
              id="website"
              type="url"
              placeholder="https://yourstore.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              invalid={Boolean(errors.website)}
            />
            {errors.website && <FormErrorText id="website-error">{errors.website}</FormErrorText>}
          </div>

          <OnboardingNav onBack={back ? () => router.push(STEP_PATH[back]) : undefined} loading={submitting} />
        </form>
      )}
    </OnboardingLayout>
  );
}
