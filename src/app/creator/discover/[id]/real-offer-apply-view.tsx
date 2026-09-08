"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, CheckCircle2, ImageOff } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { Alert } from "@/components/reference/ui/alert";
import { DisclosureNudge } from "@/components/ai/disclosure-nudge";
import { getOffer } from "@/lib/merchant/real-store";
import { applyToOffer, listMyApplications } from "@/lib/creator/real-store";
import { getOnboardingRecord } from "@/lib/onboarding/store";
import { formatCurrency } from "@/lib/merchant/format";
import { ApiError } from "@/lib/api";
import type { RealOffer } from "@/lib/merchant/types";
import type { CreatorDetails } from "@/lib/onboarding/types";

/**
 * Real-mode counterpart to offer-apply-view.tsx. `GET /offers/{id}` is public scope — the same
 * endpoint the merchant-facing detail view calls, reused here rather than duplicated. Error
 * copy is whatever the server sent (ApiError.uiMessage now prefers that by default — see
 * lib/api/errors.ts) rather than a hand-maintained per-reason map: SELF_DEALING_BLOCKED,
 * APPLICATION_ALREADY_EXISTS, NOT_FOUND, and RATE_LIMITED (20/hr) already have real, specific
 * messages from the backend. "Already applied" is pre-checked via listMyApplications (real now,
 * 2026-09-06) rather than only discovered by attempting and getting APPLICATION_ALREADY_EXISTS
 * back — matches the mock's own eager check.
 */
export function RealOfferApplyView({ email, offerId }: { email: string; offerId: string }) {
  const [offer, setOffer] = useState<RealOffer | null | undefined>(undefined);
  const [profile, setProfile] = useState<CreatorDetails | undefined>();
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setOffer(await getOffer(offerId));
      } catch {
        setOffer(null);
      }
      setProfile(getOnboardingRecord(email)?.creator);
      try {
        const applications = await listMyApplications();
        if (applications.some((a) => a.offerId === offerId)) setApplied(true);
      } catch {
        // Non-fatal — worst case, a real duplicate attempt still surfaces
        // APPLICATION_ALREADY_EXISTS from the actual apply call below.
      }
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
    setApplyError(null);
    // Best-effort human-readable summary from the creator's own known profile — the only real
    // audience data a merchant reviewing this application will see (RealApplication's own doc
    // comment, types.ts, on why: creatorX fields snapshot from the CreatorProfile the backend
    // holds, which this text doesn't replace, but audienceSnippet is still shown verbatim on
    // review, so it's worth sending something legible rather than leaving it blank).
    const snippet = profile
      ? `${profile.primaryPlatform} · ${Number(profile.audienceSize).toLocaleString()} followers · ${profile.niche}`
      : undefined;
    try {
      await applyToOffer(offerId, snippet);
      setApplied(true);
    } catch (err) {
      setApplyError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/creator/discover" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Discover
      </Link>

      <Card className="overflow-hidden p-0">
        <div className="h-64 w-full bg-foreground/5">
          {offer.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external Shopify CDN URL
            <img src={offer.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground-2">
              <ImageOff className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs">No image</span>
            </div>
          )}
        </div>
        <div className="p-6">
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-foreground">{offer.name}</h1>
          <p className="mt-1 text-sm capitalize text-muted-foreground">{offer.category}</p>
          <div className="mt-4 flex items-center gap-3">
            <span className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">
              {formatCurrency(offer.priceCents / 100)}
            </span>
            <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent-foreground">{offer.commissionRate}% commission</span>
          </div>
        </div>
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

      {applyError && (
        <Alert variant="error">
          <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" /> {applyError}</span>
        </Alert>
      )}

      {applied ? (
        <Alert variant="success">
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> You&apos;ve applied — the merchant will review it.</span>
        </Alert>
      ) : (
        <Button className="w-full" onClick={handleApply} loading={submitting}>
          Apply to this offer
        </Button>
      )}
    </div>
  );
}
