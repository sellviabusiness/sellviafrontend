"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Users, TrendingUp, Radio } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { Textarea } from "@/components/reference/ui/textarea";
import { Label } from "@/components/reference/ui/label";
import { StatusBadge, type StatusTone } from "@/components/reference/ui/status-badge";
import { TrackingLinkBox } from "@/components/merchant/tracking-link-box";
import { getApplication, getOffer, approveApplication, rejectApplication } from "@/lib/merchant/store";
import { getMockCreator, localFitSummarySnippet } from "@/lib/merchant/mock-creators";
import type { Application, ApplicationStatus, Offer } from "@/lib/merchant/types";

const STATUS_TONE: Record<ApplicationStatus, StatusTone> = { pending: "warning", approved: "success", rejected: "danger" };

/**
 * D6 — audience data + AI fit summary, Approve/Reject. Both actions are synchronous local writes
 * (approveApplication/rejectApplication in store.ts) — "feels immediate, not queued" is satisfied
 * by there being no artificial delay/queue to begin with, not by hiding a real one.
 *
 * On approval, `application.affiliateLink.url` (store.ts's approveApplication) is the offer's
 * canonical tracking link with this creator's `?ref=` code appended — shown here via
 * TrackingLinkBox as "the creator's access to the offer's tracking link," per D6's explicit
 * requirement.
 */
export function ApplicationReviewView({
  email,
  applicationId,
  fitSummary,
}: {
  email: string;
  applicationId: string;
  fitSummary: ReactNode;
}) {
  const router = useRouter();
  const [application, setApplication] = useState<Application | null | undefined>(undefined);
  const [offer, setOffer] = useState<Offer | undefined>();
  const [busy, setBusy] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  async function refresh() {
    const app = (await getApplication(email, applicationId)) ?? null;
    setApplication(app);
    if (app) setOffer(await getOffer(email, app.offerId));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, applicationId]);

  if (application === undefined) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }
  if (application === null) {
    return <p className="text-sm text-muted-foreground">Application not found.</p>;
  }

  const creator = getMockCreator(application.creatorId);

  async function handleApprove() {
    setBusy(true);
    await approveApplication(email, applicationId);
    setBusy(false);
    await refresh();
  }

  async function handleReject() {
    setBusy(true);
    await rejectApplication(email, applicationId, rejectReason);
    setBusy(false);
    setShowRejectForm(false);
    await refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">
            {creator?.name ?? "Unknown creator"}
          </h1>
          <p className="text-sm text-muted-foreground">Applying to &ldquo;{offer?.productName ?? "an offer"}&rdquo;</p>
        </div>
        <StatusBadge tone={STATUS_TONE[application.status]}>{application.status}</StatusBadge>
      </div>

      <Card className="grid grid-cols-3 divide-x divide-border p-0">
        <div className="flex flex-col items-center gap-1 p-4 text-center">
          <Radio className="h-4 w-4 text-muted-foreground-2" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground capitalize">{creator?.platform ?? "—"}</p>
          <p className="text-xs text-muted-foreground-2">Platform</p>
        </div>
        <div className="flex flex-col items-center gap-1 p-4 text-center">
          <Users className="h-4 w-4 text-muted-foreground-2" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">{creator ? creator.audienceSize.toLocaleString() : "—"}</p>
          <p className="text-xs text-muted-foreground-2">Audience</p>
        </div>
        <div className="flex flex-col items-center gap-1 p-4 text-center">
          <TrendingUp className="h-4 w-4 text-muted-foreground-2" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">{creator ? `${creator.engagementRate.toFixed(1)}%` : "—"}</p>
          <p className="text-xs text-muted-foreground-2">Engagement</p>
        </div>
      </Card>

      {creator && offer && (
        <p className="text-sm text-muted-foreground">
          Quick take: {localFitSummarySnippet(creator, offer)}
        </p>
      )}

      {fitSummary}

      {application.status === "pending" && !showRejectForm && (
        <div className="flex gap-3">
          <Button className="flex-1" onClick={handleApprove} loading={busy}>Approve</Button>
          <Button variant="secondary" className="flex-1 text-danger" onClick={() => setShowRejectForm(true)}>Reject</Button>
        </div>
      )}

      {application.status === "pending" && showRejectForm && (
        <Card className="space-y-3 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="rejectReason">Reason (optional)</Label>
            <Textarea
              id="rejectReason"
              placeholder="Shown to the creator — leave blank if you'd rather not say."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowRejectForm(false)} disabled={busy}>Cancel</Button>
            <Button className="flex-1 text-danger" variant="secondary" onClick={handleReject} loading={busy}>Confirm reject</Button>
          </div>
        </Card>
      )}

      {application.status === "approved" && application.affiliateLink && (
        <Card className="p-5">
          <p className="mb-2 text-sm font-medium text-foreground">
            {creator?.name ?? "This creator"} now has access to this offer&apos;s tracking link.
          </p>
          <TrackingLinkBox url={application.affiliateLink.url} label="Creator's tracking link" />
          <p className="mt-2 text-xs text-muted-foreground-2">
            Fallback discount code: <code>{application.affiliateLink.discountCode}</code>
          </p>
        </Card>
      )}

      <button type="button" onClick={() => router.push("/merchant/applications")} className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
        Back to applications
      </button>
    </div>
  );
}
