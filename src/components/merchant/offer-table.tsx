"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { StatusBadge, type StatusTone } from "@/components/reference/ui/status-badge";
import { ConfirmDialog } from "@/components/reference/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function setStatus(status: Offer["status"]) {
    await setOfferStatus(email, offer.id, status);
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
      <td className="px-4 py-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Actions for ${offer.productName}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {offer.status === "live" && <DropdownMenuItem onSelect={() => setStatus("paused")}>Pause</DropdownMenuItem>}
            {offer.status === "paused" && <DropdownMenuItem onSelect={() => setStatus("live")}>Resume</DropdownMenuItem>}
            {(offer.status === "live" || offer.status === "paused") && (
              <DropdownMenuItem onSelect={() => setStatus("ended")}>End</DropdownMenuItem>
            )}
            {offer.status !== "archived" && <DropdownMenuItem onSelect={handleArchive}>Archive</DropdownMenuItem>}
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
