"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, MousePointerClick } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Button, buttonVariants } from "@/components/reference/ui/button";
import { StatCard } from "@/components/reference/ui/stat-card";
import { StatusBadge, type StatusTone } from "@/components/reference/ui/status-badge";
import { ConfirmDialog } from "@/components/reference/ui/confirm-dialog";
import { TrackingLinkBox } from "@/components/merchant/tracking-link-box";
import { getOffer, getOfferStats, setOfferStatus, deleteOffer, recordOfferClick } from "@/lib/merchant/store";
import { formatCurrency, formatPercent } from "@/lib/merchant/format";
import { getOnboardingRecord } from "@/lib/onboarding/store";
import type { Offer } from "@/lib/merchant/types";

const STATUS_TONE: Record<Offer["status"], StatusTone> = {
  live: "success",
  paused: "warning",
  ended: "neutral",
  archived: "neutral",
};

/**
 * D4 — status + commission, performance stats, application/sale summaries, pause/resume/end/edit
 * actions, and a billing-advisory banner in place of a literal "auto-paused" trigger: this build
 * doesn't model a real system-initiated pause event (no inventory/stock system, and the real
 * snippet-verification + Paddle-billing draft→live gates are the explicit MVP-demo skip per
 * Playbook 04 §2b) — so rather than fabricate a fake "auto-paused" state, this shows a real,
 * checkable advisory instead: if the merchant's Switch billing (onboarding C2) isn't connected,
 * a banner says so and links to Settings → Billing. Flagged here as the deliberate interpretation
 * of D4's "auto-paused banner where applicable" line, not a silent guess.
 */
export function OfferDetailView({ email, offerId }: { email: string; offerId: string }) {
  const router = useRouter();
  const [offer, setOffer] = useState<Offer | null | undefined>(undefined);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getOfferStats>> | null>(null);
  const [billingConnected, setBillingConnected] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function refresh() {
    const found = (await getOffer(email, offerId)) ?? null;
    setOffer(found);
    if (found) setStats(await getOfferStats(email, offerId));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    setBillingConnected(getOnboardingRecord(email)?.billingStatus === "connected");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, offerId]);

  if (offer === undefined) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }
  if (offer === null) {
    return <p className="text-sm text-muted-foreground">Offer not found.</p>;
  }

  async function setStatus(status: Offer["status"]) {
    await setOfferStatus(email, offerId, status);
    refresh();
  }

  async function handleDelete() {
    await deleteOffer(email, offerId);
    setConfirmOpen(false);
    router.push("/merchant/offers");
  }

  async function simulateClick() {
    await recordOfferClick(email, offerId);
    refresh();
  }

  return (
    <div className="space-y-6">
      {!billingConnected && (
        <div className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-accent/30 bg-accent/10 px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <span className="flex-1 text-foreground">
            Billing isn&apos;t connected — commission on new sales can&apos;t be collected until it is.
          </span>
          <Link href="/merchant/settings/billing" className="font-medium text-accent underline underline-offset-2">
            Connect billing
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">
              {offer.productName}
            </h1>
            <StatusBadge tone={STATUS_TONE[offer.status]}>{offer.status}</StatusBadge>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(offer.price)} · {offer.category} · {offer.commissionRate}% commission
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {offer.status === "live" && <Button variant="secondary" onClick={() => setStatus("paused")}>Pause</Button>}
          {offer.status === "paused" && <Button variant="secondary" onClick={() => setStatus("live")}>Resume</Button>}
          {(offer.status === "live" || offer.status === "paused") && (
            <Button variant="secondary" onClick={() => setStatus("ended")}>End</Button>
          )}
          <Link href={`/merchant/offers/${offerId}/edit`} className={buttonVariants({ variant: "secondary" })}>Edit</Link>
          <Button variant="ghost" className="text-danger" onClick={() => setConfirmOpen(true)}>Delete</Button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Clicks" value={stats.clicks} icon={<MousePointerClick className="h-4 w-4" aria-hidden="true" />} />
          <StatCard label="Conversion" value={formatPercent(stats.conversionRate)} />
          <StatCard label="Sales" value={formatCurrency(stats.totalSales)} />
          <StatCard label="Spend" value={formatCurrency(stats.spend)} />
        </div>
      )}

      <Card className="p-5">
        <p className="text-xs font-medium text-muted-foreground">Tracking link</p>
        <p className="mb-3 text-xs text-muted-foreground-2">
          Shared with every approved creator (each gets a personalized <code>?ref=</code> copy) — see the
          application it&apos;s attached to for that copy.
        </p>
        <TrackingLinkBox url={offer.trackingLink} label="" />
        <button
          type="button"
          onClick={simulateClick}
          className="mt-3 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Simulate a click (dev-only — no real tracking pixel exists yet)
        </button>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm font-medium text-foreground">Applications</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{stats?.applications ?? 0}</p>
          <p className="text-xs text-muted-foreground-2">{stats?.approvedCreators ?? 0} approved creator(s)</p>
          <Link href={`/merchant/applications?offerId=${offerId}`} className="mt-2 inline-block text-xs text-accent underline underline-offset-2">
            View applications
          </Link>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-foreground">Sales</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{formatCurrency(stats?.totalSales ?? 0)}</p>
          <p className="text-xs text-muted-foreground-2">{stats ? formatCurrency(stats.spend) : "—"} commission owed</p>
          <Link href={`/merchant/sales?offerId=${offerId}`} className="mt-2 inline-block text-xs text-accent underline underline-offset-2">
            View sales
          </Link>
        </Card>
      </div>

      {offer.description && (
        <Card className="p-5">
          <p className="mb-1 text-sm font-medium text-foreground">Description</p>
          <p className="text-sm text-muted-foreground">{offer.description}</p>
        </Card>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={`Delete ${offer.productName}?`}
        description="This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
