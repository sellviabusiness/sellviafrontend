"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, Trash2 } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { StatusBadge, type StatusTone } from "@/components/reference/ui/status-badge";
import { ConfirmDialog } from "@/components/reference/ui/confirm-dialog";
import { Alert } from "@/components/reference/ui/alert";
import { getOffer, setOfferStatus, deleteOffer } from "@/lib/merchant/real-store";
import { formatCurrency } from "@/lib/merchant/format";
import { ApiError } from "@/lib/api";
import type { RealOffer, RealOfferStatus } from "@/lib/merchant/types";

const STATUS_TONE: Record<RealOfferStatus, StatusTone> = {
  draft: "neutral",
  pending_vetting: "warning",
  live: "success",
  paused: "warning",
  ended: "neutral",
};

/**
 * Real-mode counterpart to offer-detail-view.tsx. No Edit action — offers have no real edit
 * endpoint at all (deliberate; see API-ENDPOINTS.md's "Known Gaps"), so the only path to change
 * a live offer's fixed details is deleting and creating a fresh one. No tracking link either —
 * an offer itself has nothing shareable in the real model; that only exists per-creator, once an
 * application is approved (their own AffiliateLink). No per-offer stats yet — lands with the
 * Applications/Sales real-mode pass, not guessed at here.
 */
export function RealOfferDetailView({ offerId }: { offerId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justCreated = searchParams.get("justCreated") === "1";

  const [offer, setOffer] = useState<RealOffer | null | undefined>(undefined);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function refresh() {
    try {
      setOffer(await getOffer(offerId));
    } catch {
      setOffer(null);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerId]);

  if (offer === undefined) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }
  if (offer === null) {
    return <p className="text-sm text-muted-foreground">Offer not found.</p>;
  }

  async function handleSetStatus(status: "live" | "paused" | "ended") {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await setOfferStatus(offerId, status);
      setOffer(updated);
      if (status === "live" && updated.status === "pending_vetting") {
        setActionError("This offer's commission rate needs a quick admin review before it can go live.");
      }
    } catch (err) {
      setActionError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteOffer(offerId);
      router.push("/merchant/offers");
    } catch (err) {
      setConfirmOpen(false);
      setActionError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {justCreated && offer.status === "live" && (
        <Alert variant="success">Your offer is live. Creators can now discover and apply — once you approve one, they get their own trackable link.</Alert>
      )}
      {offer.status === "pending_vetting" && (
        <div className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-accent/30 bg-accent/10 px-4 py-3 text-sm">
          <Clock className="h-4 w-4 shrink-0 text-accent-foreground" aria-hidden="true" />
          <span className="text-foreground">This offer&apos;s commission rate needs a quick admin review before it goes live — you&apos;ll be notified once it&apos;s decided.</span>
        </div>
      )}
      {actionError && <Alert variant="error">{actionError}</Alert>}

      <Card className="p-5">
        <div className="flex gap-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-foreground/5">
            {offer.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- external Shopify CDN URL
              <img src={offer.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground-2">No image</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-[family-name:var(--font-heading)] text-lg font-semibold text-foreground">{offer.name}</h1>
              <StatusBadge tone={STATUS_TONE[offer.status]}>{offer.status.replace("_", " ")}</StatusBadge>
            </div>
            <p className="mt-0.5 text-sm capitalize text-muted-foreground">
              {offer.category} · {offer.commissionRate}% commission
            </p>
            <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">
              {formatCurrency(offer.priceCents / 100)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Product page</p>
            <Link href={offer.productUrl} target="_blank" rel="noopener noreferrer" className="block max-w-[280px] truncate text-sm text-accent-foreground underline underline-offset-2">
              {offer.productUrl}
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {offer.status === "draft" && (
              <Button className="rounded-full" onClick={() => handleSetStatus("live")} loading={busy}>Publish</Button>
            )}
            {offer.status === "live" && (
              <Button variant="secondary" className="rounded-full" onClick={() => handleSetStatus("paused")} loading={busy}>Pause</Button>
            )}
            {offer.status === "paused" && (
              <Button className="rounded-full" onClick={() => handleSetStatus("live")} loading={busy}>Resume</Button>
            )}
            {(offer.status === "live" || offer.status === "paused") && (
              <Button variant="secondary" className="rounded-full" onClick={() => handleSetStatus("ended")} loading={busy}>End</Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              className="aspect-square rounded-full p-0 text-danger"
              onClick={() => setConfirmOpen(true)}
              disabled={busy}
              aria-label="Delete offer"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title={`Delete ${offer.name}?`}
        description="This can't be undone. If a creator's already approved on this offer, end it instead — deleting is blocked while any active affiliate link exists."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
