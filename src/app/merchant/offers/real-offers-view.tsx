"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { Button, buttonVariants } from "@/components/reference/ui/button";
import { Select } from "@/components/reference/ui/select";
import { StatusBadge, type StatusTone } from "@/components/reference/ui/status-badge";
import { ConfirmDialog } from "@/components/reference/ui/confirm-dialog";
import { Alert } from "@/components/reference/ui/alert";
import { listMyOffers, setOfferStatus, deleteOffer } from "@/lib/merchant/real-store";
import { formatCurrency } from "@/lib/merchant/format";
import { ApiError } from "@/lib/api";
import type { RealOffer, RealOfferStatus } from "@/lib/merchant/types";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<RealOfferStatus, StatusTone> = {
  draft: "neutral",
  pending_vetting: "warning",
  live: "success",
  paused: "warning",
  ended: "neutral",
};

const STATUS_FILTERS: Array<{ value: RealOfferStatus | "all"; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending_vetting", label: "Awaiting review" },
  { value: "live", label: "Live" },
  { value: "paused", label: "Paused" },
  { value: "ended", label: "Ended" },
];

/**
 * Real-mode counterpart to offers-view.tsx — fully separate rather than one branched component
 * (see RealOffer's own doc comment in types.ts for why). No application/sale counts per offer
 * yet — that lands with the Applications/Sales real-mode pass, not guessed at here.
 */
export function RealOffersView({ email }: { email: string }) {
  const [ready, setReady] = useState(false);
  const [offers, setOffers] = useState<RealOffer[]>([]);
  const [statusFilter, setStatusFilter] = useState<RealOfferStatus | "all">("all");
  const [loadError, setLoadError] = useState<string | null>(null);

  async function refresh() {
    try {
      setOffers(await listMyOffers());
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.uiMessage : "Couldn't load your offers.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh().then(() => setReady(true));
  }, [email]);

  const filtered = statusFilter === "all" ? offers : offers.filter((o) => o.status === statusFilter);

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Offers</h1>
          <p className="text-sm text-muted-foreground">Products you&apos;re offering creators a commission on.</p>
        </div>
        {offers.length > 0 && (
          <Link href="/merchant/offers/new" className={cn(buttonVariants({ variant: "primary" }), "shrink-0")}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New offer
          </Link>
        )}
      </div>

      {loadError && <Alert variant="error">{loadError}</Alert>}

      {offers.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-5 w-5" aria-hidden="true" />}
          title="No offers yet"
          description="Create an offer to start getting creator applications."
          action={
            <Link href="/merchant/offers/new" className={buttonVariants({ variant: "primary" })}>
              + Create your first offer
            </Link>
          }
        />
      ) : (
        <>
          <div className="max-w-xs">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as RealOfferStatus | "all")}>
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </Select>
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No offers match this filter.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((offer) => (
                <OfferRow key={offer.id} offer={offer} onChanged={refresh} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OfferRow({ offer, onChanged }: { offer: RealOffer; onChanged: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleSetStatus(status: "live" | "paused" | "ended") {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await setOfferStatus(offer.id, status);
      if (status === "live" && updated.status === "pending_vetting") {
        setActionError("This offer's commission rate needs a quick admin review before it can go live.");
      }
      onChanged();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteOffer(offer.id);
      setConfirmOpen(false);
      onChanged();
    } catch (err) {
      setConfirmOpen(false);
      setActionError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
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
            <p className="truncate font-[family-name:var(--font-heading)] text-lg font-semibold text-foreground">{offer.name}</p>
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

      {actionError && <p className="mt-3 text-xs text-danger">{actionError}</p>}

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
            aria-label={`Delete ${offer.name}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={`Delete ${offer.name}?`}
        description="This can't be undone. If a creator's already approved on this offer, end it instead — deleting is blocked while any active affiliate link exists."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </Card>
  );
}
