/**
 * MOCK DATA LAYER — onboarding-complete fallback signal.
 *
 * Stands in for: nothing on its own — this is the kratos-mode FALLBACK only, used when
 * `AppSession.onboardingComplete` isn't available (see lib/onboarding/status.ts). The real target
 * is the same `PATCH /onboarding/complete` this file's sibling store.ts already documents;
 * once the real backend sets a session-native `onboardingComplete` flag, this cookie is deleted
 * outright, not migrated to an endpoint of its own.
 *
 * A server-readable "onboarding complete" signal, same split as lib/auth/mock/session-cookie.ts
 * (isomorphic writer here, server-only reader in ./status.ts). Stores the *email* it was set
 * for rather than a bare boolean — so if a different account logs in on the same browser, the
 * stale flag simply doesn't match and correctly reads as "incomplete" again, with no dependency
 * on remembering to clear it on logout.
 */
export const ONBOARDING_COMPLETE_COOKIE = "sellvia_onboarding_complete";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function setOnboardingCompleteCookie(email: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${ONBOARDING_COMPLETE_COOKIE}=${encodeURIComponent(email)}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax`;
}
