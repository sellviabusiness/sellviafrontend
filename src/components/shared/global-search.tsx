"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/reference/ui/input";
import { StatusBadge, type StatusTone } from "@/components/reference/ui/status-badge";
import { search } from "@/lib/search/real-store";
import { formatCurrency } from "@/lib/merchant/format";
import { ApiError } from "@/lib/api";
import type {
  MerchantSearchResults,
  CreatorSearchResults,
  SearchOfferStatus,
  SearchApplicationStatus,
  SearchSaleStatus,
} from "@/lib/search/types";

const OFFER_STATUS_TONE: Record<SearchOfferStatus, StatusTone> = {
  draft: "neutral",
  pending_vetting: "warning",
  live: "success",
  paused: "warning",
  ended: "neutral",
};
const APPLICATION_STATUS_TONE: Record<SearchApplicationStatus, StatusTone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};
const SALE_STATUS_TONE: Record<SearchSaleStatus, StatusTone> = {
  reported: "neutral",
  accepted: "success",
  rejected: "danger",
  billed: "success",
  refunded: "warning",
};

/**
 * Typeahead, not a search-results page — up to 5 most-recent matches per category, no pagination,
 * no "view all" (a real ask, not part of this). Debounced 300ms; an empty/whitespace query never
 * calls the endpoint at all (backend would just return every category empty anyway — this is
 * purely skipping the network round trip, not different behavior).
 *
 * One shared component for both roles rather than two near-identical ones — `role` picks the
 * response type (`search<MerchantSearchResults | CreatorSearchResults>`), the category
 * labels/rendering, and where each result routes to. Creator applications/affiliate links have no
 * per-item detail route in this app (see lib/search's own note) — those route to the list page
 * they already live on (/creator/applications), not a fabricated detail URL.
 */
export function GlobalSearch({ role }: { role: "merchant" | "creator" }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MerchantSearchResults | CreatorSearchResults | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery) {
      // Clearing state to match an external input (the query going empty), not derived render
      // state — same pattern the rest of this app's load effects already use.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const result = role === "merchant" ? await search<MerchantSearchResults>(debouncedQuery) : await search<CreatorSearchResults>(debouncedQuery);
        if (cancelled) return;
        setResults(result);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.uiMessage : "Search failed.");
        setResults(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, role]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  // Shown whenever there's an active query in flight or resolved — loading/error/empty-results
  // all render *something* in the panel (a spinner, the error, or "No results."), so this only
  // needs to gate on "is there a query being searched at all", not on which categories came back.
  const showPanel = open && debouncedQuery.length > 0 && (loading || error !== null || results !== null);

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Search…"
        icon={loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
      />

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-[70vh] overflow-y-auto rounded-[var(--radius-sm)] border-2 border-border bg-card shadow-brutal-sm">
          {error ? (
            <p className="p-3 text-sm text-danger">{error}</p>
          ) : results ? (
            <ResultGroups role={role} results={results} onSelect={go} />
          ) : (
            <p className="p-3 text-sm text-muted-foreground">Searching…</p>
          )}
        </div>
      )}
    </div>
  );
}

function ResultGroups({
  role,
  results,
  onSelect,
}: {
  role: "merchant" | "creator";
  results: MerchantSearchResults | CreatorSearchResults;
  onSelect: (href: string) => void;
}) {
  const nothingFound = results.offers.length === 0 && results.applications.length === 0 && (
    role === "merchant" ? (results as MerchantSearchResults).sales.length === 0 : (results as CreatorSearchResults).affiliateLinks.length === 0
  );

  if (nothingFound) {
    return <p className="p-3 text-sm text-muted-foreground">No results.</p>;
  }

  return (
    <div className="divide-y divide-border">
      {results.offers.length > 0 && (
        <Group title="Offers">
          {results.offers.map((o) => (
            <ResultRow
              key={o.id}
              onClick={() => onSelect(role === "merchant" ? `/merchant/offers/${o.id}` : `/creator/discover/${o.id}`)}
              title={o.name}
              subtitle={`${o.category} · ${o.commissionRate}% commission`}
              badge={<StatusBadge tone={OFFER_STATUS_TONE[o.status]}>{o.status.replace("_", " ")}</StatusBadge>}
            />
          ))}
        </Group>
      )}

      {results.applications.length > 0 && (
        <Group title="Applications">
          {results.applications.map((a) => (
            <ResultRow
              key={a.id}
              onClick={() => onSelect(role === "merchant" ? `/merchant/applications/${a.id}` : "/creator/applications")}
              title={a.offerName}
              subtitle={role === "merchant" ? (a as MerchantSearchResults["applications"][number]).creatorName ?? undefined : undefined}
              badge={<StatusBadge tone={APPLICATION_STATUS_TONE[a.status]}>{a.status}</StatusBadge>}
            />
          ))}
        </Group>
      )}

      {role === "merchant" && (results as MerchantSearchResults).sales.length > 0 && (
        <Group title="Sales">
          {(results as MerchantSearchResults).sales.map((s) => (
            <ResultRow
              key={s.id}
              onClick={() => onSelect(`/merchant/sales/${s.id}`)}
              title={s.offerName}
              subtitle={`Order ${s.externalOrderId} · ${formatCurrency(s.amountCents / 100)}`}
              badge={<StatusBadge tone={SALE_STATUS_TONE[s.status]}>{s.status}</StatusBadge>}
            />
          ))}
        </Group>
      )}

      {role === "creator" && (results as CreatorSearchResults).affiliateLinks.length > 0 && (
        <Group title="Affiliate Links">
          {(results as CreatorSearchResults).affiliateLinks.map((l) => (
            <ResultRow key={l.id} onClick={() => onSelect("/creator/applications")} title={l.offerName} subtitle={l.slug} />
          ))}
        </Group>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="p-2">
      <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground-2">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ResultRow({
  onClick,
  title,
  subtitle,
  badge,
}: {
  onClick: () => void;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] px-2 py-2 text-left hover:bg-foreground/5"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{title}</span>
        {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
      </span>
      {badge}
    </button>
  );
}
