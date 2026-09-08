import { cookies } from "next/headers"

import { ACTIVE_CONTEXT_COOKIE } from "./active-context"

// Server Components/Actions/Route Handlers only — uses next/headers, which
// proxy.ts (Node.js Proxy runtime) can't. proxy.ts reads the same cookie
// straight off NextRequest instead (see src/proxy.ts).
export async function getActiveContextCookieValue(): Promise<string | undefined> {
  return (await cookies()).get(ACTIVE_CONTEXT_COOKIE)?.value
}
