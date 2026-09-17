"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
// BUG FOUND LIVE — @clerk/nextjs@7.8.3's own top-level barrel doesn't re-export HandleSSOCallback
// (checked its compiled index.d.ts/index.js directly: every other UI component from
// client-boundary/uiComponents.ts is re-exported, this one silently isn't — an omission in this
// version, not a naming difference). @clerk/react does export it, and is what @clerk/nextjs's own
// ClerkProvider wraps internally (see ClerkProvider.js: `InternalClerkProvider as ReactClerkProvider
// from "@clerk/react/internal"`), so it shares the exact same Clerk context — this is also the
// import @clerk/react's own JSDoc example for this component uses.
import { HandleSSOCallback } from "@clerk/react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthCard } from "@/components/auth/auth-card";
import { Alert } from "@/components/reference/ui/alert";
import { isMockMode } from "@/lib/auth/config";

/**
 * Lands here after Google/Apple hands control back to Clerk mid-OAuth-flow — both
 * ClerkLoginForm's and ClerkRegisterForm's `signIn.sso()`/`signUp.sso()` calls point their
 * `redirectUrl`/`redirectCallbackUrl` here (both, the same page — the "Future" SSO API's split
 * between the two is still marked `@revamp-hooks` upstream even in Clerk's own types, so this
 * page is written to handle either landing correctly rather than guess which one fires when).
 *
 * `HandleSSOCallback` is the "Future"-generation counterpart to the classic
 * `AuthenticateWithRedirectCallback` — matches the rest of this app's Clerk integration, which
 * already uses `signIn.password()`/`signIn.finalize()`/`signIn.mfa.*` throughout, not the classic
 * `signIn.create()`/`attemptFirstFactor()` shape.
 */
export function SsoCallbackView() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ROOT CAUSE HUNT (reported live: stuck on "Signing you in…" forever, no role screen) —
    // HandleSSOCallback (see its full source in the comment below) runs its whole handshake in a
    // fire-and-forget `(async () => {...})()` inside its own useEffect: nothing here calls or
    // awaits it, so if any of its internal `signIn.create({transfer:true})`/
    // `signUp.create({transfer:true})`/`.finalize()` calls reject, that promise rejection has
    // nowhere to go but `window`'s unhandledrejection event — Clerk's component has no try/catch
    // of its own, so without this listener that failure is completely invisible: no branch
    // matches, nothing navigates, and this page just sits here. Surfacing it instead of leaving
    // it to only ever show up in a browser console nobody's looking at.
    function onUnhandledRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : typeof reason === "string" ? reason : JSON.stringify(reason);
      setError(`Sign-in failed to complete: ${message}`);
    }
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    // Separate, generic safety net — if nothing has navigated or errored within 12s, whatever
    // hung wasn't necessarily an outright rejection (e.g. a network call that never resolves).
    // Same "invisible failure" family of bug, without assuming a promise rejection specifically.
    const stuckTimer = setTimeout(() => {
      setError((current) => current ?? "This is taking longer than expected. Your sign-in may not have completed — try again.");
    }, 12000);
    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      clearTimeout(stuckTimer);
    };
  }, []);

  if (isMockMode) {
    // Never actually reachable in mock mode (nothing links here — social buttons only render in
    // Clerk mode), but this component uses real Clerk hooks that throw outside <ClerkProvider>,
    // which mock mode never mounts. Guarded rather than assumed unreachable.
    return (
      <AuthLayout>
        <AuthCard>
          <Alert variant="error">This page isn&apos;t available in mock mode.</Alert>
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard>
        {error ? (
          <div className="space-y-3">
            <Alert variant="error">{error}</Alert>
            <button
              type="button"
              onClick={() => router.replace("/login")}
              className="w-full text-center text-xs text-muted-foreground-2 underline underline-offset-2 hover:text-foreground"
            >
              Back to login
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Signing you in…</p>
        )}
        <HandleSSOCallback
          navigateToApp={async ({ session, decorateUrl }) => {
            if (session?.currentTask) {
              setError(`Your account needs an extra step (${session.currentTask.key}) this app doesn't support yet — contact support.`);
              return;
            }
            // A brand-new OAuth account has no role yet — password signup collects it via
            // RoleSelector before the account even exists, but OAuth has no such step, so it's
            // asked here instead, once, right after auth. An existing account signing back in
            // already has one and skips straight to /dashboard.
            const existingRoles = (session?.user?.publicMetadata as { roles?: string[] } | undefined)?.roles;
            const destination = !existingRoles || existingRoles.length === 0 ? "/onboarding/choose-role" : "/dashboard";
            const url = decorateUrl(destination);
            if (url.startsWith("http")) window.location.href = url;
            else router.replace(url);
          }}
          navigateToSignIn={() => router.replace("/login")}
          navigateToSignUp={() => router.replace("/register")}
        />
      </AuthCard>
    </AuthLayout>
  );
}
