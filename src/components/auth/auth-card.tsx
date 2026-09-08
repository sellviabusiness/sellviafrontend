import type { ReactNode } from "react";
import { Card } from "@/components/reference/ui/card";
import { SellViaLogo } from "@/components/reference/brand/sellvia-logo";

/**
 * The one bordered card every auth screen renders inside — logo top-left, then whatever content
 * each screen passes in (AuthHeader + AuthFlowForm).
 *
 * No theme toggle here (removed — senior's explicit requirement): the toggle belongs only inside
 * the Merchant/Creator dashboards (components/merchant/topbar.tsx, components/shell/app-shell.tsx),
 * never on Authentication screens.
 */
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <Card className="w-full p-6 sm:p-7">
      <div className="mb-4">
        <SellViaLogo height={28} />
      </div>
      {children}
    </Card>
  );
}
