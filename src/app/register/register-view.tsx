"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthFlowForm } from "@/components/auth/auth-flow-form";
import { AuthFooter } from "@/components/auth/auth-footer";
import { AuthLink } from "@/components/auth/auth-link";
import { RoleSelector } from "@/components/auth/role-selector";
import { DataDisclosureNote } from "@/components/auth/data-disclosure-note";

export function RegisterView() {
  const router = useRouter();
  const [roles, setRoles] = useState<string[]>([]);

  return (
    <AuthLayout>
      <AuthCard>
        <AuthHeader heading="Create your account" subheading="Start selling and promoting with SellVia" />

        <AuthFlowForm
          kind="registration"
          returnTo="/dashboard"
          // Falls back to /dashboard only if the provider's response doesn't itself ask for
          // verification next (see the shared continue_with handling in AuthFlowForm).
          onAuthenticated={() => router.replace("/dashboard")}
          extraFields={<RoleSelector selected={roles} onChange={setRoles} />}
        />

        <div className="mt-3">
          <DataDisclosureNote />
        </div>
      </AuthCard>

      <AuthFooter>
        Already have an account? <AuthLink href="/login" emphasis>Log in</AuthLink>
      </AuthFooter>
    </AuthLayout>
  );
}
