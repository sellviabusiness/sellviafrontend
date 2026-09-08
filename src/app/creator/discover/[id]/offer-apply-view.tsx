"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { Alert } from "@/components/reference/ui/alert";
import { DisclosureNudge } from "@/components/ai/disclosure-nudge";
import { findOfferById, applyToOfferAsCreator, getApplicationsForCreator } from "@/lib/merchant/store";
import { deriveCreatorId } from "@/lib/creator/identity";
import { getOnboardingRecord } from "@/lib/onboarding/store";
import { formatCurrency } from "@/lib/merchant/format";
import type { Offer } from "@/lib/merchant/types";
import type { CreatorDetails } from "@/lib/onboarding/types";
import type { ApplyResult } from "@/lib/merchant/store";

const ERROR_COPY: Record<Exclude<ApplyResult, { ok: true }>["reason"], string> = {
  duplicate: "You've already applied to this offer — only one application per offer is allowed.",
  self_dealing: "You can't apply to your own offer.",
  not_found: "This offer couldn't be found — it may have been removed.",
};

/**
 * E3 — offer detail + apply form. Audience snippet is this creator's own onboarding profile,
 * reused read-only (not re-collected). The three error states are real, distinct outcomes from
 * applyToOfferAsCreator (lib/merchant/store.ts) — "rate-limited" is deliberately the same
 * "duplicate" result per the approved simplification (max 1 application per offer *is* the rate
 * limit here), not a separate mechanism.
 */
export function OfferApplyView({ email, offerId }: { email: string; offerId: string }) {
  const [offer, setOffer] = useState<Offer | null | undefined>(undefined);
  const [profile, setProfile] = useState<CreatorDetails | undefined>();
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const creatorId = deriveCreatorId(email);
    (async () => {
      const [offerRes, applicationsRes] = await Promise.all([findOfferById(offerId), getApplicationsForCreator(creatorId)]);
       
      setOffer(offerRes ?? null);
      setProfile(getOnboardingRecord(email)?.creator);
      setAlreadyApplied(applicationsRes.some((o) => o.offer.id === offerId));
    })();
  }, [email, offerId]);

  if (offer === undefined) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }
  if (offer === null) {
    return <p className="text-sm text-muted-foreground">Offer not found.</p>;
  }

  async function handleApply() {
    setSubmitting(true);
    const creatorId = deriveCreatorId(email);
    const outcome = await applyToOfferAsCreator(offerId, creatorId, email);
    setResult(outcome);
    if (outcome.ok) setAlreadyApplied(true);
    setSubmitting(false);
  }

  const applied = alreadyApplied || result?.ok;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/creator/discover" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Discover
      </Link>

      <Card className="p-6">
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">{offer.productName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{offer.category} · {offer.productType}</p>
        <div className="mt-3 flex items-center gap-4 text-sm">
          <span className="text-foreground">{formatCurrency(offer.price)}</span>
          <span className="text-muted-foreground-2">{offer.commissionRate}% commission</span>
        </div>
        {offer.description && <p className="mt-4 text-sm text-muted-foreground">{offer.description}</p>}
      </Card>

      {profile && (
        <Card className="p-5">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Your audience (from your profile)</p>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div>
              <p className="font-semibold text-foreground capitalize">{profile.primaryPlatform}</p>
              <p className="text-xs text-muted-foreground-2">Platform</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">{Number(profile.audienceSize).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground-2">Audience</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">{profile.niche}</p>
              <p className="text-xs text-muted-foreground-2">Niche</p>
            </div>
          </div>
        </Card>
      )}

      <DisclosureNudge />

      {result && !result.ok && (
        <Alert variant="error">
          <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" /> {ERROR_COPY[result.reason]}</span>
        </Alert>
      )}

      {applied ? (
        <Alert variant="success">
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> You&apos;ve applied — track it from My Applications.</span>
        </Alert>
      ) : (
        <Button className="w-full" onClick={handleApply} loading={submitting}>
          Apply to this offer
        </Button>
      )}
    </div>
  );
}
