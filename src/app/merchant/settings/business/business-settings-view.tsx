"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Label } from "@/components/reference/ui/label";
import { Input } from "@/components/reference/ui/input";
import { Select } from "@/components/reference/ui/select";
import { Button } from "@/components/reference/ui/button";
import { OFFER_CATEGORIES } from "@/lib/merchant/constants";
import { getOnboardingRecord, saveCommonProfile, saveMerchantDetails } from "@/lib/onboarding/store";

/**
 * D10 — edits the SAME business-profile fields collected during Feature 2 onboarding
 * (lib/onboarding/store.ts's CommonProfile + MerchantDetails), through the SAME save functions —
 * not a second, parallel business-profile store. This is the intended "reuse" this task asked
 * for everywhere else (billing/security below do the same).
 */
export function BusinessSettingsView({ email }: { email: string }) {
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");
  const [website, setWebsite] = useState("");

  useEffect(() => {
    const record = getOnboardingRecord(email);
    if (record?.commonProfile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFullName(record.commonProfile.fullName);
      setPhone(record.commonProfile.phone);
      setCountry(record.commonProfile.country);
    }
    if (record?.merchant) {
      setBusinessName(record.merchant.businessName);
      setBusinessCategory(record.merchant.businessCategory);
      setWebsite(record.merchant.website);
    }
    setReady(true);
  }, [email]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    saveCommonProfile(email, { fullName: fullName.trim(), email, country: country.trim(), phone: phone.trim() });
    saveMerchantDetails(email, {
      businessName: businessName.trim(),
      businessCategory,
      productType: getOnboardingRecord(email)?.merchant?.productType ?? "physical",
      website: website.trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href="/merchant/settings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Settings
      </Link>

      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Business profile</h1>
        <p className="text-sm text-muted-foreground">These are the same details collected during onboarding.</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="country">Country</Label>
            <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="businessName">Business name</Label>
            <Input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="businessCategory">Business category</Label>
            <Select id="businessCategory" value={businessCategory} onChange={(e) => setBusinessCategory(e.target.value)}>
              <option value="" disabled>Select one</option>
              {OFFER_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website">Website / store URL</Label>
            <Input id="website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} />
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
