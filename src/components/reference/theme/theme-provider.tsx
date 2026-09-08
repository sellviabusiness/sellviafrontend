"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Wraps next-themes. LIGHT is the app-wide default (Playbook 10 §2, supersedes the earlier
 * dark-default decision) — every screen, including the three dashboards, first renders light for
 * a brand-new visitor; the dark/light toggle itself only appears inside the Merchant/Creator/
 * Admin dashboards (their own topbars), not on auth/onboarding, but this default applies
 * everywhere regardless, since ThemeProvider is mounted once at the true root (src/app/layout.tsx)
 * and there's no separate per-section default to diverge. Uses the `class` strategy so
 * globals.css's bare `:root` (light) and `.dark` block apply correctly.
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
