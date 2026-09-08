"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, TrendingUp, Radio, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { Alert } from "@/components/reference/ui/alert";
import { StatusBadge, type StatusTone } from "@/components/reference/ui/status-badge";
import { getOffer, approveApplication, rejectApplication } from "@/lib/merchant/real-store";
import { apiRequest, ApiError } from "@/lib/api";
import type { RealApplication, RealApplicationStatus, RealOffer } from "@/lib/merchant/types";

const STATUS_TONE: Record<RealApplicationStatus, StatusTone> = { pending: "warning", approved: "success", rejected: "danger" };

/**
 * Real-mode counterpart to application-review-view.tsx. No tracking-link display on approval —
 * unlike the mock, a merchant has no real way to read the resulting AffiliateLink at all
 * (GET /affiliate-links is creator-only scope; nothing merchant-facing returns it) — shows a
 * plain confirmation instead of fabricating a link. Reject has no reason field: the real
 * endpoint takes no request body.
 */
export function RealApplicationReviewView({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [application, setApplication] = useState<RealApplication | null | undefined>(undefined);
  const [offer, setOffer] = useState<RealOffer | undefined>();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function refresh() {
    try {
      // No GET /applications/{id} exists — read the one we have via the list, filtered.
      const list = await apiRequest<RealApplication[]>("/applications/mine");
      const found = list.find((a) => a.id === applicationId) ?? null;
      setApplication(found);
      if (found) setOffer(await getOffer(found.offerId));
    } catch {
      setApplication(null);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  if (application === undefined) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }
  if (application === null) {
    return <p className="text-sm text-muted-foreground">Application not found.</p>;
  }

  async function handleApprove() {
    setBusy(true);
    setActionError(null);
    try {
      await approveApplication(applicationId);
      await refresh();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    setBusy(true);
    setActionError(null);
    try {
      await rejectApplication(applicationId);
      await refresh();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">
            {application.creatorName ?? "Unnamed creator"}
          </h1>
          <p className="text-sm text-muted-foreground">Applying to &ldquo;{offer?.name ?? "an offer"}&rdquo;</p>
        </div>
        <StatusBadge tone={STATUS_TONE[application.status]}>{application.status}</StatusBadge>
      </div>

      <Card className="grid grid-cols-3 divide-x divide-border p-0">
        <div className="flex flex-col items-center gap-1 p-4 text-center">
          <Radio className="h-4 w-4 text-muted-foreground-2" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground capitalize">{application.creatorPlatform ?? "—"}</p>
          <p className="text-xs text-muted-foreground-2">Platform</p>
        </div>
        <div className="flex flex-col items-center gap-1 p-4 text-center">
          <Users className="h-4 w-4 text-muted-foreground-2" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">{application.creatorAudienceSize.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground-2">Audience</p>
        </div>
        <div className="flex flex-col items-center gap-1 p-4 text-center">
          <TrendingUp className="h-4 w-4 text-muted-foreground-2" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">
            {application.creatorEngagementRate !== null ? `${application.creatorEngagementRate.toFixed(1)}%` : "—"}
          </p>
          <p className="text-xs text-muted-foreground-2">Engagement</p>
        </div>
      </Card>

      {application.creatorNiche && (
        <p className="text-sm text-muted-foreground">Niche: {application.creatorNiche}</p>
      )}
      {application.audienceSnippet && (
        <Card className="p-5">
          <p className="mb-1 text-xs font-medium text-muted-foreground">From the creator</p>
          <p className="text-sm text-foreground">{application.audienceSnippet}</p>
        </Card>
      )}

      {actionError && <Alert variant="error">{actionError}</Alert>}

      {application.status === "pending" && (
        <div className="flex gap-3">
          <Button className="flex-1" onClick={handleApprove} loading={busy}>Approve</Button>
          <Button variant="secondary" className="flex-1 text-danger" onClick={handleReject} loading={busy}>Reject</Button>
        </div>
      )}

      {application.status === "approved" && (
        <Alert variant="success">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            {application.creatorName ?? "This creator"} now has access to this offer — their own tracking link is generated on their side.
          </span>
        </Alert>
      )}

      <button type="button" onClick={() => router.push("/merchant/applications")} className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
        Back to applications
      </button>
    </div>
  );
}
