"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { safeReturnTo } from "@/lib/auth/safe-return-to";

/**
 * Client-side guard mirroring login/register page.tsx's own server-side "already signed in ->
 * /dashboard" redirect (getServerSession() + redirect()) — needed because that check only runs
 * on a genuinely fresh server request.
 *
 * BUG FOUND LIVE — confirmed against a real Clerk instance: reaching this form via a
 * client-side-cached navigation (e.g. back/forward, or staying on the same tab after finishing
 * an auth flow elsewhere) can skip the server check entirely, landing on a form that's doomed
 * before it's even touched — signUp.password()/signIn.password() both reject outright once a
 * session already exists ("You're already signed in."), a confusing dead end with no path
 * forward. useAuth() reflects live client auth state regardless of what got cached, so it's the
 * one check that can't go stale the way the server-rendered page can.
 *
 * BUG FOUND LIVE, ROUND 2 — the fix above introduced a new race: `isSignedIn` also flips to
 * `true` the MOMENT this form's own signUp.finalize()/signIn.finalize() succeeds (that's the
 * whole point of finalize — it activates the session), while ITS OWN `navigate` callback is
 * still in the middle of routing to a properly `decorateUrl()`-decorated destination (the
 * mechanism that carries a session-sync token some Clerk dev instances need — see that
 * callback's own comments in clerk-login-form.tsx/clerk-register-form.tsx). If this hook reacted
 * to that same `isSignedIn` flip, it fired a SECOND, un-decorated `router.replace(returnTo)`
 * racing the first — sometimes winning, landing on the destination without the sync token the
 * server needed to recognize the brand-new session, which read as "verified fine, logged in,
 * but never actually got onboarded" (dashboard/page.tsx's own session check would come up empty
 * for that one request). Fix: only ever act on whatever `isSignedIn` FIRST resolves to once
 * Clerk finishes loading — i.e. "were they already signed in when this page was reached", a
 * one-time snapshot, not "are they signed in right now" (which a form's OWN successful
 * completion also makes true, and isn't this hook's job to react to).
 */
export function useRedirectIfSignedIn(returnTo: string): boolean {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [initiallySignedIn, setInitiallySignedIn] = useState<boolean | null>(null);
  // SECURITY (background review) — re-validated here rather than trusted from the caller, same
  // reasoning as clerk-login-form.tsx/clerk-register-form.tsx's own matching comment: both
  // current callers already sanitize `returnTo` before passing it in, but this hook shouldn't be
  // the third place quietly depending on that staying true for every future caller too.
  const safeReturn = safeReturnTo(returnTo);

  useEffect(() => {
    if (isLoaded && initiallySignedIn === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time snapshot, not an ongoing sync
      setInitiallySignedIn(!!isSignedIn);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately not reacting to isSignedIn changing later
  }, [isLoaded]);

  useEffect(() => {
    if (initiallySignedIn) router.replace(safeReturn);
  }, [initiallySignedIn, safeReturn, router]);

  return !!initiallySignedIn;
}
