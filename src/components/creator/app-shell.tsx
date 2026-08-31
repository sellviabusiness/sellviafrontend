"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getOnboardingRecord } from "@/lib/onboarding/store";
import { CreatorSidebar, CreatorMobileNav } from "./sidebar";
import { CreatorTopbar } from "./topbar";

/** Mirrors components/merchant/app-shell.tsx exactly (Playbook 05 §4/§16). */
export function CreatorAppShell({
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
      <CreatorTopbar email={email} fullName={fullName} roles={roles} onMenuClick={() => setMobileNavOpen(true)} />
      <CreatorMobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex flex-1">
        <CreatorSidebar />
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
