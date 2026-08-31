"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Users, Search } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Input } from "@/components/reference/ui/input";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { StatusBadge } from "@/components/reference/ui/status-badge";
import { getUserSummaries, type UserSummary } from "@/lib/admin/store";
import { formatRelativeTime } from "@/lib/merchant/format";

export function UsersView() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUsers(getUserSummaries());
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.email.toLowerCase().includes(q) || u.roles.some((r) => r.includes(q)));
  }, [users, query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground">Every account on the platform, across roles.</p>
      </div>

      <div className="max-w-sm">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email or role"
          icon={<Search className="h-4 w-4" aria-hidden="true" />}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Users className="h-5 w-5" aria-hidden="true" />} title="No accounts found" description="Try a different search." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Roles</th>
                <th className="px-4 py-3 font-medium">Verified</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.email} className="border-b border-border last:border-0 hover:bg-foreground/5">
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${encodeURIComponent(u.email)}`} className="font-medium text-foreground hover:underline">
                      {u.email}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.roles.join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.verified ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={u.suspended ? "danger" : "success"}>{u.suspended ? "Suspended" : "Active"}</StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.createdAt ? formatRelativeTime(u.createdAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
