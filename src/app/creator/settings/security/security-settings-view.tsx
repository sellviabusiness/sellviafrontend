"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Monitor } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { AuthFlowForm } from "@/components/auth/auth-flow-form";

/** E10 — same B5/D12 MFA/password flow and mock active-sessions treatment as Merchant Settings
 *  → Security, embedded here rather than rebuilt. See components/merchant/settings/security's
 *  own doc comment for the full reasoning (real for this device only, no server-side multi-
 *  device session store exists yet). */
export function SecuritySettingsView() {
  const [userAgent, setUserAgent] = useState("");
  const [loggedOutOthers, setLoggedOutOthers] = useState(false);

  useEffect(() => {
    // navigator is client-only — can't read during the server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUserAgent(navigator.userAgent);
  }, []);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href="/creator/settings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Settings
      </Link>

      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Security</h1>
        <p className="text-sm text-muted-foreground">Password, two-factor authentication, and active sessions.</p>
      </div>

      <Card className="p-5">
        <p className="mb-3 text-sm font-medium text-foreground">Active sessions</p>
        <div className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-border p-3">
          <Monitor className="h-4 w-4 shrink-0 text-muted-foreground-2" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-foreground">{userAgent || "This device"}</p>
            <p className="text-xs text-muted-foreground-2">Current session</p>
          </div>
        </div>
        <Button variant="secondary" className="mt-3 w-full" onClick={() => setLoggedOutOthers(true)} disabled={loggedOutOthers}>
          {loggedOutOthers ? "Other devices logged out" : "Log out all other devices"}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground-2">
          Mock — no real multi-device session tracking exists yet; only this device&apos;s own session is real.
        </p>
      </Card>

      <Card className="p-6">
        <AuthFlowForm kind="settings" allowFreshSettings />
      </Card>
    </div>
  );
}
