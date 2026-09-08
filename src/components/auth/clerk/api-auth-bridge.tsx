"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { setAuthTokenProvider } from "@/lib/api";

/**
 * Wires lib/api/client.ts's Authorization header to Clerk's session token for
 * browser-initiated apiRequest() calls — confirmed scheme with the backend:
 * `Authorization: Bearer <clerk-session-token>`, verified there via clerk-backend-api's
 * authenticate_request_async.
 *
 * Mounted once in app/layout.tsx, only inside <ClerkProvider> (mock mode never mounts this —
 * see isMockMode there — and has nothing real to authenticate against yet either way).
 *
 * Client-side only, deliberately: this sets ONE shared module-level provider, which is fine for
 * a browser tab (one visitor) but unsafe for a Server Component/Action, where the same Next.js
 * server process can be mid-flight on many different users' requests at once — those must pass
 * `authToken` explicitly per call instead (see lib/auth/clerk/server-api-token.ts).
 */
export function ApiAuthBridge() {
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthTokenProvider(() => getToken());
    return () => setAuthTokenProvider(null);
  }, [getToken]);

  return null;
}
