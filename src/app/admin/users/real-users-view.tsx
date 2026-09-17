"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Search } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Input } from "@/components/reference/ui/input";
import { Button } from "@/components/reference/ui/button";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { StatusBadge } from "@/components/reference/ui/status-badge";
import { Alert } from "@/components/reference/ui/alert";
import { SkeletonTableRows } from "@/components/reference/ui/skeleton";
import { listUsers } from "@/lib/admin/real-store";
import { formatRelativeTime } from "@/lib/merchant/format";
import { ApiError } from "@/lib/api";
import type { RealUser } from "@/lib/admin/types";

const PAGE_SIZE = 50;
const ROLE_VALUES = ["merchant", "creator", "admin"] as const;

function roleLabel(u: RealUser): string {
  const roles = [u.isMerchant && "merchant", u.isCreator && "creator", u.isAdmin && "admin"].filter(Boolean);
  return roles.join(", ") || "no role";
}

/**
 * Real-mode counterpart to users-view.tsx. No per-user aggregate counts (offers/applications/
 * sales/pending payout) — that was mock-only "ticket context"; the real UserRead has none of it.
 *
 * BUG FOUND LIVE (2026-09-13) — this used to fetch one unfiltered page (server default 50) and
 * filter client-side against just that page: silently wrong for any account past the first 50,
 * which hundreds of real accounts already were before a recent cleanup. Backend now takes real
 * `email`/`role` query params (`listUsers` in real-store.ts) — search is debounced and hits the
 * server for real instead. The single box still does double duty (email substring vs. role name)
 * since that's the UX the screenshot's own box already established; it just decides which param
 * to send rather than pretending both work over one client-side array.
 */
export function RealUsersView() {
  const [users, setUsers] = useState<RealUser[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const q = debouncedQuery.toLowerCase();
    const params = ROLE_VALUES.includes(q as (typeof ROLE_VALUES)[number])
      ? { role: q as (typeof ROLE_VALUES)[number] }
      : q
        ? { email: q }
        : {};
    let cancelled = false;
    // Kicking off a real async fetch (search re-run on debouncedQuery), not derivable state —
    // same pattern as the rest of the real-mode views' load effects.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(false);
    (async () => {
      try {
        const result = await listUsers({ ...params, limit: PAGE_SIZE, offset: 0 });
        if (cancelled) return;
        setUsers(result);
        setHasMore(result.length === PAGE_SIZE);
        setLoadError(null);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.uiMessage : "Couldn't load users.");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  async function loadMore() {
    const q = debouncedQuery.toLowerCase();
    const params = ROLE_VALUES.includes(q as (typeof ROLE_VALUES)[number])
      ? { role: q as (typeof ROLE_VALUES)[number] }
      : q
        ? { email: q }
        : {};
    setLoadingMore(true);
    try {
      const next = await listUsers({ ...params, limit: PAGE_SIZE, offset: users.length });
      setUsers((prev) => [...prev, ...next]);
      setHasMore(next.length === PAGE_SIZE);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.uiMessage : "Couldn't load more users.");
    } finally {
      setLoadingMore(false);
    }
  }

  if (!ready) {
    return <SkeletonTableRows count={6} columns={5} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground">Merchant and creator accounts — admins aren&apos;t managed here.</p>
      </div>

      {loadError && <Alert variant="error">{loadError}</Alert>}

      <div className="max-w-sm">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by email or role" icon={<Search className="h-4 w-4" aria-hidden="true" />} />
      </div>

      {users.length === 0 ? (
        <EmptyState icon={<Users className="h-5 w-5" aria-hidden="true" />} title="No accounts found" description="Try a different search." />
      ) : (
        <>
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Roles</th>
                  <th className="px-4 py-3 font-medium">At risk</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-foreground/5">
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${u.id}`} className="font-medium text-foreground hover:underline">
                        {u.email}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{roleLabel(u)}</td>
                    <td className="px-4 py-3">{u.isAtRisk && <StatusBadge tone="warning">At risk</StatusBadge>}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={u.isSuspended ? "danger" : "success"}>{u.isSuspended ? "Suspended" : "Active"}</StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatRelativeTime(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          {hasMore && (
            <Button type="button" variant="secondary" onClick={loadMore} loading={loadingMore}>
              Load more
            </Button>
          )}
        </>
      )}
    </div>
  );
}
