import "server-only";
import { AUTH_MODE } from "./config";
import { getKratosServerSession } from "./kratos/server-session";
import { getMockServerSession } from "./mock/server-session";
import type { AppSession } from "./types";

export type { AppSession } from "./types";

/**
 * Server-side session read for every page in this feature (redirect-if-authed on the auth
 * screens, redirect-if-not on the dashboard). Branches on the same env var as
 * lib/auth/provider.ts — the two must always agree on which provider is active.
 */
export async function getServerSession(): Promise<AppSession | null> {
  return AUTH_MODE === "kratos" ? getKratosServerSession() : getMockServerSession();
}
