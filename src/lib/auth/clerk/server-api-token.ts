import "server-only";
import { auth } from "@clerk/nextjs/server";

/**
 * A Clerk session token for use with a single Server Component/Server Action's own
 * apiRequest(path, { authToken }) call (lib/api/client.ts) — never the shared
 * setAuthTokenProvider() singleton, which components/auth/clerk/api-auth-bridge.tsx's own doc
 * comment explains is client-only-safe. `auth()` here is per-request (Next.js's own
 * request-scoped context), so this is safe to call concurrently across different users' requests.
 */
export async function getServerApiAuthToken(): Promise<string | null> {
  const { getToken } = await auth();
  return getToken();
}
