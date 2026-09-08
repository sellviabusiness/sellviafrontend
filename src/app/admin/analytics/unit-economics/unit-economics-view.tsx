"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { getMerchantUnitEconomics, getCreatorUnitEconomics, type MerchantUnitEconomics, type CreatorUnitEconomics } from "@/lib/admin/store";
import { formatCurrency } from "@/lib/merchant/format";

/** G10 unit economics — asymmetric by role per the real doc: merchants have real revenue
 *  (platform-fee share), creators have $0 revenue by design and are measured on GMV driven
 *  instead (see lib/admin/store.ts's own doc comment on both functions). */
export function UnitEconomicsView() {
  const [merchants, setMerchants] = useState<MerchantUnitEconomics[]>([]);
  const [creators, setCreators] = useState<CreatorUnitEconomics[]>([]);

  useEffect(() => {
    (async () => {
      const [merchantsRes, creatorsRes] = await Promise.all([getMerchantUnitEconomics(), getCreatorUnitEconomics()]);
       
      setMerchants(merchantsRes);
      setCreators(creatorsRes);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <Link href="/admin/analytics" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to analytics
      </Link>

      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Unit economics</h1>
        <p className="text-sm text-muted-foreground">Merchants have real revenue; creators have $0 revenue by design and are tracked on GMV driven instead.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">Merchants</h2>
        {merchants.length === 0 ? (
          <EmptyState title="No merchants yet" description="Nothing to show." />
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Revenue</th>
                  <th className="px-4 py-3 font-medium">Net contribution</th>
                </tr>
              </thead>
              <tbody>
                {merchants.map((m) => (
                  <tr key={m.email} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-foreground">{m.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatCurrency(m.revenue)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatCurrency(m.netContribution)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">Creators</h2>
        {creators.length === 0 ? (
          <EmptyState title="No creators yet" description="Nothing to show." />
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[320px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Creator</th>
                  <th className="px-4 py-3 font-medium">GMV driven</th>
                </tr>
              </thead>
              <tbody>
                {creators.map((c) => (
                  <tr key={c.email} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-foreground">{c.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatCurrency(c.gmvDriven)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}
