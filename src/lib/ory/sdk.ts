import { Configuration, FrontendApi } from "@ory/client"

import { isMockAuth } from "./mock/config"
import { mockOryClient } from "./mock/client"

// Kratos URL — unverified against Authentication / API Authentication docs
// (unreachable: private submodule, no bypass secret). This client only ever
// runs server-side (Server Components, Server Actions, Route Handlers,
// middleware): it reads sessions and fetches flows. The browser never talks
// to it directly — flow *submission* is a native HTML form POST straight to
// the flow's own `ui.action`, proxied same-origin through /api/.ory (see
// next.config.ts) so the session cookie stays first-party. Same env var
// backs both this client and that proxy.
function resolveOrySdkUrl(): string {
  const url = process.env.ORY_SDK_URL
  if (!url) {
    throw new Error(
      "ORY_SDK_URL not configured — set it to Kratos's URL in .env.local. Placeholder until Authentication docs confirm the real value."
    )
  }
  return url
}

let client: FrontendApi | undefined

/**
 * Lazy singleton — constructed (and the env var checked) on first real use,
 * not at module import time, so importing this module doesn't crash `next
 * build` before ORY_SDK_URL is ever set.
 *
 * MOCK_AUTH=1 (see ./mock/config.ts) swaps this for an in-process mock with
 * the same method surface, for local viewing/testing with no real Kratos
 * reachable — off by default, real deployments are unaffected.
 */
export function getOry(): FrontendApi {
  if (isMockAuth()) return mockOryClient as unknown as FrontendApi
  if (!client) {
    client = new FrontendApi(new Configuration({ basePath: resolveOrySdkUrl() }))
  }
  return client
}
