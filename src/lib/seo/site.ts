// Unverified against Hosting Strategy doc (unreachable: private submodule,
// no bypass secret) — the real production domain isn't confirmed. Falls
// back to localhost rather than throwing: metadata generation runs for
// every page, including at build time for statically-rendered routes, so a
// hard fail-loud here (the pattern used in lib/ory/sdk.ts, lib/api/client.ts
// for runtime-only calls) would break every build until this is set. Set
// NEXT_PUBLIC_SITE_URL in production.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
export const SITE_NAME = "SellVia"
