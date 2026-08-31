"use client";

import { useState, type ReactNode } from "react";
import { AdminSidebar, AdminMobileNav } from "./sidebar";
import { AdminTopbar } from "./topbar";

/** Mirrors components/merchant/app-shell.tsx / components/creator/app-shell.tsx exactly. */
export function AdminAppShell({ email, children }: { email: string; children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AdminTopbar email={email} onMenuClick={() => setMobileNavOpen(true)} />
      <AdminMobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
