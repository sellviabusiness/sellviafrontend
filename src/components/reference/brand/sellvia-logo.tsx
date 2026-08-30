import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Intrinsic size of public/logo.png — used to scale the rendered size without distorting the
// artwork's actual proportions.
//
// LOGO SWAP (Playbook 10 §3): replaced with the new official wordmark (white "SellVia" text,
// upward arrow standing in for the "L" — same identity as before, refined asset). Native size
// updated to match the new file (was 205x70 for the old baked-in-black-box artwork).
const NATIVE_WIDTH = 326;
const NATIVE_HEIGHT = 87;

/**
 * The real SellVia logo (public/logo.png), rendered at its own aspect ratio — no cropping, no
 * circular mask, no recoloring.
 *
 * DARK CHIP WRAPPER (Playbook 10 §3): the new logo file is white artwork on a fully transparent
 * background — unlike the old asset, it doesn't carry its own dark backing, so on its own it goes
 * invisible against a light page (light is now the app-wide default, Playbook 10 §2). Wrapped in
 * a solid dark rounded chip here so the logo stays legible everywhere regardless of the current
 * page/theme background — this is CSS, not baked into the image, so it can't drift out of sync
 * with a future asset swap. `height` sizes the logo artwork itself; the chip's padding scales
 * proportionally so smaller/larger renders (topbar vs. auth card) stay visually consistent.
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
  const width = Math.round((NATIVE_WIDTH / NATIVE_HEIGHT) * height);
  const paddingX = Math.round(height * 0.45);
  const paddingY = Math.round(height * 0.32);

  const chip = (
    <span
      className={cn("inline-flex items-center justify-center rounded-[var(--radius-sm)] bg-[#0A0A0A]", className)}
      style={{ paddingLeft: paddingX, paddingRight: paddingX, paddingTop: paddingY, paddingBottom: paddingY }}
    >
      <Image src="/logo.png" alt="SellVia" width={width} height={height} className="h-auto w-auto" priority />
    </span>
  );

  if (!asLink) return chip;

  return (
    <Link
      href={href}
      className="inline-flex rounded-[var(--radius-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {chip}
    </Link>
  );
}
