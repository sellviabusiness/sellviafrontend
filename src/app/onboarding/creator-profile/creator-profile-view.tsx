"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { OnboardingLayout } from "@/components/onboarding/onboarding-layout";
import { OnboardingNav } from "@/components/onboarding/onboarding-nav";
import { OnboardingSkeleton } from "@/components/onboarding/onboarding-skeleton";
import { useOnboardingStep } from "@/components/onboarding/use-onboarding-step";
import { Label } from "@/components/reference/ui/label";
import { Input } from "@/components/reference/ui/input";
import { Select } from "@/components/reference/ui/select";
import { FormErrorText } from "@/components/reference/ui/form-error-text";
import { saveCreatorDetails } from "@/lib/onboarding/store";
import { STEP_PATH, stepAfter, stepBefore } from "@/lib/onboarding/steps";
import type { CreatorDetails } from "@/lib/onboarding/types";

const PLATFORMS: { value: CreatorDetails["primaryPlatform"]; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
];

const NICHES = ["Beauty", "Fashion", "Tech", "Lifestyle", "Fitness", "Gaming", "Food", "Other"];

export function CreatorProfileView({ email, sessionRoles }: { email: string; sessionRoles: string[] }) {
  const router = useRouter();
  const { record, ready, roles } = useOnboardingStep("creator-profile", email, sessionRoles);

  const [primaryPlatform, setPrimaryPlatform] = useState<CreatorDetails["primaryPlatform"] | "">("");
  const [handle, setHandle] = useState("");
  const [audienceSize, setAudienceSize] = useState("");
  const [niche, setNiche] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (record?.creator) {
      // Hydrating local form state from the async-loaded (client-only) saved record.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrimaryPlatform(record.creator.primaryPlatform);
      setHandle(record.creator.handle);
      setAudienceSize(record.creator.audienceSize);
      setNiche(record.creator.niche);
    }
  }, [record]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!primaryPlatform) nextErrors.primaryPlatform = "Choose your primary platform.";
    if (handle.trim().length < 2) nextErrors.handle = "Enter your handle or profile link.";
    const audienceNum = Number(audienceSize);
    if (!audienceSize.trim() || Number.isNaN(audienceNum) || audienceNum < 0) {
      nextErrors.audienceSize = "Enter an approximate follower/subscriber count.";
    }
    if (!niche) nextErrors.niche = "Choose your niche or category.";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    saveCreatorDetails(email, {
      primaryPlatform: primaryPlatform as CreatorDetails["primaryPlatform"],
      handle: handle.trim(),
      audienceSize: audienceSize.trim(),
      niche,
    });
    const next = stepAfter("creator-profile", roles) ?? "payout";
    router.push(STEP_PATH[next]);
  }

  const back = stepBefore("creator-profile", roles);

  return (
    <OnboardingLayout step="creator-profile" roles={roles}>
      <div className="mb-5 space-y-1">
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">
          Tell us about your content
        </h1>
        <p className="text-sm text-muted-foreground">Help brands understand what you create.</p>
      </div>

      {!ready ? (
        <OnboardingSkeleton />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="primaryPlatform" required>Primary platform</Label>
            <Select
              id="primaryPlatform"
              value={primaryPlatform}
              onChange={(e) => setPrimaryPlatform(e.target.value as CreatorDetails["primaryPlatform"])}
              invalid={Boolean(errors.primaryPlatform)}
            >
              <option value="" disabled>Select one</option>
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </Select>
            {errors.primaryPlatform && <FormErrorText id="primaryPlatform-error">{errors.primaryPlatform}</FormErrorText>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="handle" required>Handle / profile link</Label>
            <Input
              id="handle"
              placeholder="@username or https://instagram.com/username"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              invalid={Boolean(errors.handle)}
            />
            {errors.handle && <FormErrorText id="handle-error">{errors.handle}</FormErrorText>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="audienceSize" required>Audience size</Label>
            <Input
              id="audienceSize"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="e.g. 25000"
              value={audienceSize}
              onChange={(e) => setAudienceSize(e.target.value)}
              invalid={Boolean(errors.audienceSize)}
            />
            {errors.audienceSize && <FormErrorText id="audienceSize-error">{errors.audienceSize}</FormErrorText>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="niche" required>Niche / category</Label>
            <Select
              id="niche"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              invalid={Boolean(errors.niche)}
            >
              <option value="" disabled>Select one</option>
              {NICHES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
            {errors.niche && <FormErrorText id="niche-error">{errors.niche}</FormErrorText>}
          </div>

          <OnboardingNav onBack={back ? () => router.push(STEP_PATH[back]) : undefined} />
        </form>
      )}
    </OnboardingLayout>
  );
}
