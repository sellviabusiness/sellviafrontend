import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

import { SITE_URL, SITE_NAME } from "@/lib/seo/site";
import { ThemeProvider } from "@/components/reference/theme/theme-provider";
import { ApiAuthBridge } from "@/components/auth/clerk/api-auth-bridge";
import { isMockMode } from "@/lib/auth/config";

// Design System (docs: UX/Design System, Technical Architecture/Frontend Architecture)
// Bricolage Grotesque — headlines, hero copy, nav, CTA buttons, section titles
const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-bricolage-grotesque",
  subsets: ["latin"],
});

// Instrument Sans — paragraphs, labels, form fields, cards, metadata
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
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
      className={`${bricolageGrotesque.variable} ${instrumentSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/* suppressHydrationWarning here too — this exact warning, with a `cz-shortcut-listen`
          attribute appearing only on the client's <body>, is the ColorZilla browser extension
          injecting it before React hydrates (Next.js's own hydration-mismatch docs use this same
          attribute as their canonical browser-extension example). Not caused by anything on this
          page/route — it's local to whichever browser has that extension installed, and the
          mismatch is real but harmless (an extension-added attribute, not app content). */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/* Only mounted in clerk mode — constructing ClerkProvider without real Clerk keys
            configured (the mock-mode default, see lib/auth/config.ts) throws at render time,
            and the app must stay usable with zero real environment available. */}
        {isMockMode ? (
          <ThemeProvider>{children}</ThemeProvider>
        ) : (
          <ClerkProvider>
            <ApiAuthBridge />
            <ThemeProvider>{children}</ThemeProvider>
          </ClerkProvider>
        )}
      </body>
    </html>
  );
}
