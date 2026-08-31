"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Intrinsic size of each logo asset — used to scale the rendered size without distorting the
// artwork's actual proportions. The two files are NOT the same aspect ratio (the light wordmark's
// lettering has different proportions than the dark one's), so each gets its own native size
// rather than assuming they match.
const DARK_NATIVE = { width: 326, height: 87 }; // public/logo.png — white text, transparent bg
const LIGHT_NATIVE = { width: 326, height: 128 }; // public/logo-light.png — black text, transparent bg

/**
 * The real SellVia logo, theme-aware (Playbook 10 §3 follow-up — separate light/dark assets, not
 * one asset forced onto both backgrounds).
 *
 * - Dark mode: public/logo.png (white wordmark) — UNCHANGED from before, still wrapped in the
 *   solid dark chip it already had, since the page background can't be assumed pure black
 *   everywhere the logo appears.
 * - Light mode: public/logo-light.png (black wordmark, the exact attached asset — not recreated)
 *   — rendered directly with no chip. It's black-on-transparent, already clearly visible against
 *   a light page on its own; wrapping it in a chip would be a visual change the request didn't
 *   ask for.
 *
 * Hydration: next-themes only knows the real theme after mount (the server can't read the
 * client's stored preference). Renders the light asset — the app's own default theme — until
 * mounted, then swaps to whichever `resolvedTheme` actually says, matching next-themes' own
 * documented pattern for theme-dependent UI. No layout shift either way: both branches render at
 * the same `height`, only the source/wrapper differs.
 */
export function SellViaLogo({
  className,
  height = 28,
  asLink = true,
  href = "/",
}: {
  className?: string;
  height?: number;
  asLink?: boolean;
  /** Where the logo links to — the public placeholder home by default. Authenticated contexts
   *  (onboarding, dashboard) pass "/dashboard" so the logo doesn't take a signed-in user out to
   *  the marketing placeholder. */
  href?: string;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Mount-detection for the theme-dependent asset swap below — same "client-only state, can't
    // know it during SSR" pattern this app already uses throughout (see any dashboard view's own
    // localStorage-read effect).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  const native = isDark ? DARK_NATIVE : LIGHT_NATIVE;
  const width = Math.round((native.width / native.height) * height);

  const img = (
    <Image
      src={isDark ? "/logo.png" : "/logo-light.png"}
      alt="SellVia"
      width={width}
      height={height}
      // No h-auto/w-auto here on purpose: that class previously let the browser fall back to
      // the loaded resource's own natural pixel size instead of these explicit width/height —
      // since next/image picks a different srcset resource per asset, that made light and dark
      // render at two different visual sizes even at the same `height` prop. Explicit width/height
      // (already computed above from each asset's real native aspect ratio) is what must govern
      // render size so both themes match.
      style={{ height, width, display: "block" }}
      priority
    />
  );

  const mark = isDark ? (
    <span
      className={cn("inline-flex items-center justify-center rounded-[var(--radius-sm)] bg-[#0A0A0A]", className)}
      style={{
        paddingLeft: Math.round(height * 0.45),
        paddingRight: Math.round(height * 0.45),
        paddingTop: Math.round(height * 0.32),
        paddingBottom: Math.round(height * 0.32),
      }}
    >
      {img}
    </span>
  ) : (
    <span className={cn("inline-flex items-center justify-center", className)}>{img}</span>
  );

  if (!asLink) return mark;

  return (
    <Link
      href={href}
      className="inline-flex rounded-[var(--radius-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {mark}
    </Link>
  );
}
