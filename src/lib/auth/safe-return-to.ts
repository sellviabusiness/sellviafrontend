/**
 * Validates a `?return_to=` value (proxy.ts and the other server-side guards attach it to
 * `/login` so a signed-out visit round-trips back to the page they actually asked for — see
 * login/page.tsx and login-view.tsx's own doc comments) down to a same-origin relative path,
 * falling back to `/dashboard` for anything else. An attacker can hand a victim a link like
 * `/login?return_to=<payload>` directly — this never assumed our own code set the value.
 *
 * SECURITY FIX — the original version only checked the raw string's prefix (`startsWith("/")`,
 * not `startsWith("//")`), which misses the backslash-normalization bypass: browsers treat `\`
 * as `/` when resolving a URL for a "special" scheme (http/https), so `/\evil.com` becomes
 * `//evil.com` — protocol-relative, i.e. off-site — at the exact moment `window.location.href`
 * or a redirect actually navigates, even though the raw string "starts with /". Resolving
 * through the real `URL` parser against a fixed placeholder origin (instead of pattern-matching
 * the string ourselves) means we're checking what the browser will actually navigate to, not a
 * guess at it — the placeholder is arbitrary and never reachable, it exists purely so `new URL()`
 * has an origin to resolve `value` against and compare back against afterward. Works
 * server-side and client-side alike (no `window` dependency).
 */
const PLACEHOLDER_ORIGIN = "http://sv-safe-return-to.invalid";

export function safeReturnTo(value: string | string[] | null | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "/dashboard";
  try {
    const resolved = new URL(raw, PLACEHOLDER_ORIGIN);
    if (resolved.origin !== PLACEHOLDER_ORIGIN) return "/dashboard";
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return "/dashboard";
  }
}
