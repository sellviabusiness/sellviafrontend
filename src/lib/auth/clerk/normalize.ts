import type { User } from "@clerk/nextjs/server";
import type { AppSession } from "../types";

/**
 * Clerk `User` -> this app's normalized `AppSession`. Shared by server-session.ts (Server
 * Components, via currentUser()) and proxy.ts (Proxy runtime, via clerkClient().users.getUser())
 * — both end up with a full Clerk `User` object, just fetched two different ways, so both
 * normalize through here rather than duplicating the field mapping.
 *
 * `roles` / `onboardingComplete` are read from `publicMetadata` — written by this app itself via
 * the Server Actions in app/actions/clerk-profile.ts (updateClerkRoles,
 * markClerkOnboardingComplete), which is the one place that shape is defined. There's no Clerk
 * dashboard schema to be wrong about here (unlike the old Kratos identity-schema situation this
 * replaces) since publicMetadata is an open bag this app owns both ends of — still defensively
 * typed/guarded below in case it's ever missing or malformed (e.g. an account created before
 * onboarding ran, or edited by hand in the Clerk dashboard).
 */
export function normalizeClerkUser(user: User): AppSession {
  const metadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
  const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? "";
  const verified =
    user.primaryEmailAddress?.verification?.status === "verified" ||
    user.emailAddresses[0]?.verification?.status === "verified";

  return {
    id: user.id,
    email,
    verified,
    roles: Array.isArray(metadata.roles) ? metadata.roles.filter((r): r is string => typeof r === "string") : [],
    onboardingComplete: typeof metadata.onboardingComplete === "boolean" ? metadata.onboardingComplete : undefined,
  };
}
