"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getOnboardingRecord } from "@/lib/onboarding/store";
import { MerchantSidebar, MerchantMobileNav } from "./sidebar";
import { MerchantTopbar } from "./topbar";

/**
 * App Shell — sidebar + topbar wrapping every /merchant/* route. "use client" (was a plain
 * function component) so it can own two client-only things: the mobile-nav open/close state
 * shared between the topbar's hamburger button and the drawer, and the display name shown in the
 * topbar — onboarding records are localStorage-backed (client-only, see lib/onboarding/store.ts),
 * so this can't be read server-side in layout.tsx and passed down; it's fetched here instead,
 * same pattern the Overview page already uses for its own greeting.
 */
export function MerchantAppShell({
  email,
  roles,
  children,
}: {
  email: string;
  roles: string[];
  children: ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [fullName, setFullName] = useState<string | undefined>();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFullName(getOnboardingRecord(email)?.commonProfile?.fullName);
  }, [email]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MerchantTopbar email={email} fullName={fullName} roles={roles} onMenuClick={() => setMobileNavOpen(true)} />
      <MerchantMobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex flex-1">
        <MerchantSidebar />
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
