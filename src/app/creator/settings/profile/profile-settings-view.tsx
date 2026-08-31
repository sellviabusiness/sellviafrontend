"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Info } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Label } from "@/components/reference/ui/label";
import { Input } from "@/components/reference/ui/input";
import { Select } from "@/components/reference/ui/select";
import { Button } from "@/components/reference/ui/button";
import { getOnboardingRecord, saveCreatorDetails } from "@/lib/onboarding/store";

const NICHES = ["Beauty", "Fashion", "Tech", "Lifestyle", "Fitness", "Gaming", "Food", "Other"];

/**
 * E8 — niche, audience size, engagement rate. Engagement rate is self-reported/editable for now
 * (Playbook 05 §21.3's resolution — the self-reported-vs-calculated question stays open; this is
 * explicitly the simplest, non-blocking default), with the note below saying so plainly rather
 * than presenting it as a verified metric.
 */
export function ProfileSettingsView({ email }: { email: string }) {
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [niche, setNiche] = useState("");
  const [audienceSize, setAudienceSize] = useState("");
  const [engagementRate, setEngagementRate] = useState("");
  const [platform, setPlatform] = useState<"instagram" | "tiktok" | "youtube">("instagram");
  const [handle, setHandle] = useState("");

  useEffect(() => {
    const creator = getOnboardingRecord(email)?.creator;
    if (creator) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNiche(creator.niche);
      setAudienceSize(creator.audienceSize);
      setEngagementRate(creator.engagementRate !== undefined ? String(creator.engagementRate) : "");
      setPlatform(creator.primaryPlatform);
      setHandle(creator.handle);
    }
    setReady(true);
  }, [email]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    saveCreatorDetails(email, {
      primaryPlatform: platform,
      handle,
      audienceSize: audienceSize.trim(),
      niche,
      engagementRate: engagementRate.trim() ? Number(engagementRate) : undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href="/creator/settings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Settings
      </Link>

      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground">Same details collected during onboarding — update them any time.</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="niche">Niche</Label>
            <Select id="niche" value={niche} onChange={(e) => setNiche(e.target.value)}>
              <option value="" disabled>Select one</option>
              {NICHES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="audienceSize">Audience size</Label>
            <Input id="audienceSize" type="number" min={0} value={audienceSize} onChange={(e) => setAudienceSize(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="engagementRate">Engagement rate (%)</Label>
            <Input id="engagementRate" type="number" min={0} max={100} step="0.1" value={engagementRate} onChange={(e) => setEngagementRate(e.target.value)} />
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Self-reported for now — this may be replaced with an automatically calculated number later.
            </p>
          </div>

          <Button type="submit" className="w-full">
            {saved ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
            {saved ? "Saved" : "Save changes"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
