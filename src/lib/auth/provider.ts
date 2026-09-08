import { mockProvider } from "./mock/provider";
import type { AuthProvider } from "./types";

/**
 * The seam every mock-mode auth screen goes through (AuthFlowForm, the dashboard LogoutButton,
 * complete-view's provider call). Always the mock provider now — Clerk (the real
 * provider, lib/auth/config.ts) doesn't implement this interface at all (no "flow" concept, see
 * lib/auth/types.ts's AuthProvider doc comment), so every screen that used to call
 * `authProvider.*` unconditionally now branches on `isMockMode` first and calls into
 * components/auth/clerk/ or lib/auth/clerk/ instead when it's false.
 */
export const authProvider: AuthProvider = mockProvider;
