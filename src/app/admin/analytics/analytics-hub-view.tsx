"use client";

import Link from "next/link";
import { DollarSign, PieChart, Cpu, ChevronRight } from "lucide-react";
import { Card } from "@/components/reference/ui/card";

const SECTIONS = [
  { href: "/admin/analytics/pnl", label: "Monthly P&L", description: "Platform-fee revenue vs. known cost lines, per month.", icon: DollarSign },
  { href: "/admin/analytics/unit-economics", label: "Unit economics", description: "Per-merchant net contribution and per-creator GMV driven.", icon: PieChart },
  { href: "/admin/analytics/ai-usage", label: "AI / token usage", description: "Per-call AI feature usage and cost.", icon: Cpu },
] as const;

export function AnalyticsHubView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">Financial and usage reporting for the platform as a whole.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SECTIONS.map(({ href, label, description, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="flex h-full flex-col gap-2 p-5 transition-colors hover:border-border-hover">
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
                <ChevronRight className="h-4 w-4 text-muted-foreground-2" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
