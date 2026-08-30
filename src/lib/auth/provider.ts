import { AUTH_MODE } from "./config";
import { kratosProvider } from "./kratos/provider";
import { mockProvider } from "./mock/provider";
import type { AuthProvider } from "./types";

/**
 * The single seam every client component goes through for auth (AuthFlowForm, LogoutButton).
 * Which implementation this is comes from one env var (NEXT_PUBLIC_AUTH_PROVIDER, defaults to
 * "mock" — see lib/auth/config.ts). Nothing that imports `authProvider` needs to change when
 * that flips to "kratos" against a real environment.
 */
export const authProvider: AuthProvider = AUTH_MODE === "kratos" ? kratosProvider : mockProvider;
