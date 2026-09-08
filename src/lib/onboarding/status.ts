import type { AppSession } from "@/lib/auth/types";

/**
 * Server-side gate: is *this* authenticated account's onboarding complete?
 *
 * ROOT CAUSE FOUND LIVE — this used to fall back to a side-channel, email-keyed, 1-year cookie
 * whenever `session.onboardingComplete` was `undefined` (a leftover from the since-deleted
 * kratos provider, which had no session-native write path). Both current providers now always
 * give a real answer: mock always sets a boolean (`?? false` in the mock user store), and Clerk's
 * `undefined` genuinely means "hasn't written publicMetadata.onboardingComplete yet" — i.e. not
 * complete, not "go check somewhere else". The cookie fallback being keyed only by email, not the
 * account, was the actual bug: re-registering a *deleted* Clerk account with the same email in
 * the same browser inherited that old account's stale "complete" cookie and skipped the entire
 * onboarding flow for the brand-new one. No fallback needed any more — trust the session.
 */
export async function isOnboardingComplete(session: AppSession): Promise<boolean> {
  return session.onboardingComplete ?? false;
}
