import type { Metadata } from "next";
import { Outfit, Figtree } from "next/font/google";
import "./globals.css";

import { SITE_URL, SITE_NAME } from "@/lib/seo/site";
import { ThemeProvider } from "@/components/reference/theme/theme-provider";

// Design System (docs: UX/Design System, Technical Architecture/Frontend Architecture)
// Outfit — headlines, hero copy, nav, CTA buttons, section titles
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

// Figtree — paragraphs, labels, form fields, cards, metadata
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

// metadataBase + these OG defaults cascade to every route (this is the root
// layout), including merchant/creator/admin — that's fine, they're never
// reachable by a crawler without a session (proxy.ts redirects first), and
// each of those layouts additionally sets an explicit robots noindex as
// defense-in-depth.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s — ${SITE_NAME}`,
  },
  description: "SellVia",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning — next-themes' own documented requirement: its ThemeProvider
    // (mounted once, right here — see the BUG FIX note on ReferenceThemeScope for why it used to
    // be mounted per-route instead, and what that broke) sets class/style directly on <html> via
    // an inline script before React hydrates, which is an intentional, expected mismatch
    // (next-themes' own README: "You must add suppressHydrationWarning to your <html> tag").
    <html
      lang="en"
      className={`${outfit.variable} ${figtree.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
