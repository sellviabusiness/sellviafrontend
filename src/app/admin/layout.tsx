import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getServerSession } from "@/lib/auth/session"
import { hasRole, getRolesHeld } from "@/lib/auth/role"
import { resolveFallbackHome } from "@/lib/auth/active-context"
import { getActiveContextCookieValue } from "@/lib/auth/active-context-server"
import { ROLE_PREFIX } from "@/lib/nav/config"
import { AdminAppShell } from "@/components/admin/app-shell"
import { ReferenceThemeScope } from "@/components/reference/theme-scope"

// Admin is exclusive/separate, not part of the merchant/creator switcher —
// no ContextSwitcher rendered here (see role.ts).
//
// Explicit noindex — defense-in-depth for "public pages only" (task's own
// wording, from the SEO task): this is never reachable by a crawler anyway
// (proxy.ts redirects an unauthenticated request to /login first), but say
// so explicitly rather than relying on that alone.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

// proxy.ts (src/proxy.ts) is the primary gate — this re-checks per Next's own
// guidance ("verify authentication and authorization inside each Server
// Function/route rather than relying on Proxy alone"). Cheap: same
// per-request session read, no caching either way.
//
// REDIRECT-LOOP FIX: was reading the *old*, disconnected @/lib/ory/session
// here (always null in mock mode); now reads the current session
// (lib/auth/session), same as every other guard — see creator/layout.tsx's
// longer note on the actual loop this caused.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()

  if (!session || getRolesHeld(session).size === 0) {
    redirect(`/login?return_to=${encodeURIComponent(ROLE_PREFIX.admin)}`)
  }
  if (!hasRole(session, "admin")) {
    redirect(resolveFallbackHome(session, await getActiveContextCookieValue()))
  }

  return (
    <ReferenceThemeScope>
      <AdminAppShell email={session.email}>
        {children}
      </AdminAppShell>
    </ReferenceThemeScope>
  )
}
