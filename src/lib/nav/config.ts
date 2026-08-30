import type { Role } from "@/lib/auth/role"

export interface NavItem {
  label: string
  href: string
}

// /admin/* is from the task itself. /merchant and /creator prefixes are my
// call, mirrored from that same convention for consistency — not from a
// sitemap doc (unreachable). Flag if the real routes live elsewhere.
export const ROLE_PREFIX: Record<Role, string> = {
  merchant: "/merchant",
  creator: "/creator",
  admin: "/admin",
}

export const ROLE_LABEL: Record<Role, string> = {
  merchant: "Merchant",
  creator: "Creator",
  admin: "Admin",
}

// Three separate lists, never merged — each shell renders only its own.
export const ROLE_NAV: Record<Role, NavItem[]> = {
  merchant: [
    { label: "Offers", href: "/merchant/offers" },
    { label: "Applications", href: "/merchant/applications" },
    { label: "Sales", href: "/merchant/sales" },
    { label: "Payouts", href: "/merchant/payouts" },
  ],
  creator: [
    { label: "Discover", href: "/creator/discover" },
    { label: "My Links", href: "/creator/my-links" },
    { label: "Earnings", href: "/creator/earnings" },
  ],
  // Task only specified the /admin/* prefix, not its sections — placeholder
  // single entry until a real sitemap doc lists admin's actual pages.
  admin: [{ label: "Overview", href: "/admin" }],
}
