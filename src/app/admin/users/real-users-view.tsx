"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Users, Search } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Input } from "@/components/reference/ui/input";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { StatusBadge } from "@/components/reference/ui/status-badge";
import { Alert } from "@/components/reference/ui/alert";
import { listUsers } from "@/lib/admin/real-store";
import { formatRelativeTime } from "@/lib/merchant/format";
import { ApiError } from "@/lib/api";
import type { RealUser } from "@/lib/admin/types";

function roleLabel(u: RealUser): string {
  const roles = [u.isMerchant && "merchant", u.isCreator && "creator", u.isAdmin && "admin"].filter(Boolean);
  return roles.join(", ") || "no role";
}

/** Real-mode counterpart to users-view.tsx. No per-user aggregate counts (offers/applications/
 *  sales/pending payout) — that was mock-only "ticket context"; the real UserRead has none of it. */
export function RealUsersView() {
  const [users, setUsers] = useState<RealUser[]>([]);
  const [query, setQuery] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setUsers(await listUsers());
      } catch (err) {
        setLoadError(err instanceof ApiError ? err.uiMessage : "Couldn't load users.");
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.email.toLowerCase().includes(q) || roleLabel(u).toLowerCase().includes(q));
  }, [users, query]);

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-md)] border border-border bg-foreground/5" aria-hidden="true" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground">Every account on the platform, across roles.</p>
      </div>

      {loadError && <Alert variant="error">{loadError}</Alert>}

      <div className="max-w-sm">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by email or role" icon={<Search className="h-4 w-4" aria-hidden="true" />} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Users className="h-5 w-5" aria-hidden="true" />} title="No accounts found" description="Try a different search." />
      ) : (
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
              {filtered.map((u) => (
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
      )}
    </div>
  );
}
