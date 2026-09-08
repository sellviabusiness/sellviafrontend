"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";

/**
 * Clerk-mode counterpart to authProvider.markOnboardingComplete (lib/auth/types.ts) — Clerk
 * isn't one of that interface's implementations (see its doc comment), so clerk-register-form.tsx
 * and complete-view.tsx call these Server Actions directly instead when `!isMockMode`.
 *
 * Writes to `publicMetadata` specifically (not `unsafeMetadata`, which a client component could
 * write directly without a round trip): publicMetadata is only writable with the secret key, so
 * it has to go through a Server Action/Route Handler either way, but the payoff is that
 * lib/auth/clerk/normalize.ts (used by both getServerSession() and proxy.ts's per-request user
 * lookup) can read it back as a trusted value — a client-writable field would mean any
 * signed-in user could hand themselves an `admin` role by editing unsafeMetadata directly.
 * `updateUserMetadata` merges at the top level (Clerk's documented behavior), so these two
 * actions don't clobber each other's field.
 */
export async function updateClerkRoles(roles: string[]): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in.");
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, { publicMetadata: { roles } });
}

export async function markClerkOnboardingComplete(): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in.");
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, { publicMetadata: { onboardingComplete: true } });
}
