"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthFlowForm } from "@/components/auth/auth-flow-form";
import { AuthFooter } from "@/components/auth/auth-footer";
import { AuthLink } from "@/components/auth/auth-link";
import { Alert } from "@/components/reference/ui/alert";
import { Button } from "@/components/reference/ui/button";
import type { AnyFlow } from "@/lib/auth/types";

export function VerifyEmailView() {
  const router = useRouter();
  const [flowState, setFlowState] = useState<string | null>(null);

  const sentAlready = flowState === "sent_email";

  return (
    <AuthLayout>
      <AuthCard>
        {sentAlready ? (
          <AuthHeader heading="Check your inbox" subheading="We've sent a verification link to your email." />
        ) : (
          <AuthHeader heading="Verify your email" subheading="Enter your email and we'll send you a verification link." />
        )}

        {sentAlready && (
          <p className="mb-4 text-sm text-muted-foreground">
            Open your email and click the link to verify your account. Didn&apos;t receive it?
            Use the resend button below.
          </p>
        )}

        <AuthFlowForm
          kind="verification"
          returnTo="/dashboard"
          onFlowLoaded={(flow: AnyFlow) => setFlowState((flow.state as string) ?? null)}
          successBanner={(flow) =>
            flow.state === "passed_challenge" ? (
              <div className="space-y-4">
                <Alert variant="success">Your email is verified.</Alert>
                <Button className="w-full" onClick={() => router.push("/dashboard")}>
                  Continue 
                </Button>
              </div>
            ) : null
          }
        />
      </AuthCard>

      <AuthFooter>
        <AuthLink href="/login" emphasis>Back to login</AuthLink>
      </AuthFooter>
    </AuthLayout>
  );
}
