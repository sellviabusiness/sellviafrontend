"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { StatusBadge, type StatusTone } from "@/components/reference/ui/status-badge";
import { ConfirmDialog } from "@/components/reference/ui/confirm-dialog";
import { formatCurrency } from "@/lib/merchant/format";
import { setOfferStatus, deleteOffer } from "@/lib/merchant/store";
import type { Offer } from "@/lib/merchant/types";

const STATUS_TONE: Record<Offer["status"], StatusTone> = {
  live: "success",
  paused: "warning",
  ended: "neutral",
  archived: "neutral",
};

/** D2 — real `<table>` markup (not a div-grid), one row per offer, with inline pause/resume/end/
 *  archive actions and application/sale counts. Replaces the old CampaignCard grid. */
export function OfferTable({
  email,
  offers,
  applicationCounts,
  saleCounts,
  onChanged,
}: {
  email: string;
  offers: Offer[];
  applicationCounts: Record<string, number>;
  saleCounts: Record<string, number>;
  onChanged: () => void;
}) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-foreground/5 text-left text-xs text-muted-foreground">
            <th scope="col" className="px-4 py-3 font-medium">Name</th>
            <th scope="col" className="px-4 py-3 font-medium">Price</th>
            <th scope="col" className="px-4 py-3 font-medium">Category</th>
            <th scope="col" className="px-4 py-3 font-medium">Status</th>
            <th scope="col" className="px-4 py-3 font-medium">Commission</th>
            <th scope="col" className="px-4 py-3 font-medium">Applications</th>
            <th scope="col" className="px-4 py-3 font-medium">Sales</th>
            <th scope="col" className="px-4 py-3 font-medium"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer) => (
            <OfferRow
              key={offer.id}
              email={email}
              offer={offer}
              applicationCount={applicationCounts[offer.id] ?? 0}
              saleCount={saleCounts[offer.id] ?? 0}
              onChanged={onChanged}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OfferRow({
  email,
  offer,
  applicationCount,
  saleCount,
  onChanged,
}: {
  email: string;
  offer: Offer;
  applicationCount: number;
  saleCount: number;
  onChanged: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function setStatus(status: Offer["status"]) {
    await setOfferStatus(email, offer.id, status);
    setMenuOpen(false);
    onChanged();
  }

  function handleArchive() {
    void setStatus("archived");
  }

  async function handleDelete() {
    await deleteOffer(email, offer.id);
    setConfirmOpen(false);
    onChanged();
  }

  return (
    <tr className="border-b border-border last:border-0 hover:bg-foreground/[0.03]">
      <td className="px-4 py-3">
        <Link href={`/merchant/offers/${offer.id}`} className="font-medium text-foreground hover:underline">
          {offer.productName}
        </Link>
      </td>
      <td className="px-4 py-3 text-foreground">{formatCurrency(offer.price)}</td>
      <td className="px-4 py-3 text-muted-foreground">{offer.category}</td>
      <td className="px-4 py-3"><StatusBadge tone={STATUS_TONE[offer.status]}>{offer.status}</StatusBadge></td>
      <td className="px-4 py-3 text-muted-foreground">{offer.commissionRate}%</td>
      <td className="px-4 py-3 text-muted-foreground">{applicationCount}</td>
      <td className="px-4 py-3 text-muted-foreground">{saleCount}</td>
      <td className="relative px-4 py-3 text-right">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`Actions for ${offer.productName}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <MoreVertical className="h-4 w-4" aria-hidden="true" />
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-4 top-11 z-10 w-40 space-y-1 rounded-[var(--radius-sm)] border border-border bg-card p-1.5 text-left"
          >
            {offer.status === "live" && (
              <button type="button" role="menuitem" onClick={() => setStatus("paused")} className="w-full rounded-[var(--radius-sm)] px-2.5 py-1.5 text-left text-sm text-foreground hover:bg-foreground/5">
                Pause
              </button>
            )}
            {offer.status === "paused" && (
              <button type="button" role="menuitem" onClick={() => setStatus("live")} className="w-full rounded-[var(--radius-sm)] px-2.5 py-1.5 text-left text-sm text-foreground hover:bg-foreground/5">
                Resume
              </button>
            )}
            {(offer.status === "live" || offer.status === "paused") && (
              <button type="button" role="menuitem" onClick={() => setStatus("ended")} className="w-full rounded-[var(--radius-sm)] px-2.5 py-1.5 text-left text-sm text-foreground hover:bg-foreground/5">
                End
              </button>
            )}
            {offer.status !== "archived" && (
              <button type="button" role="menuitem" onClick={handleArchive} className="w-full rounded-[var(--radius-sm)] px-2.5 py-1.5 text-left text-sm text-foreground hover:bg-foreground/5">
                Archive
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                setConfirmOpen(true);
              }}
              className="w-full rounded-[var(--radius-sm)] px-2.5 py-1.5 text-left text-sm text-danger hover:bg-danger-bg"
            >
              Delete
            </button>
          </div>
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
      </td>
    </tr>
  );
}
