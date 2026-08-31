import { Camera, Music2, PlayCircle, Globe } from "lucide-react";
import type { CreatorPlatform } from "@/lib/merchant/types";

/**
 * Lucide dropped brand/logo icons (no Instagram/TikTok/YouTube marks in this version) — using the
 * closest generic equivalents (camera / music-note / play / globe) rather than pulling in a
 * second icon package for three glyphs.
 */
const PLATFORM_ICON = {
  instagram: Camera,
  tiktok: Music2,
  youtube: PlayCircle,
  other: Globe,
} as const;

export const PLATFORM_LABEL: Record<CreatorPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  other: "Other",
};

export function PlatformIcon({ platform, className }: { platform: CreatorPlatform; className?: string }) {
  const Icon = PLATFORM_ICON[platform];
  return <Icon className={className ?? "h-4 w-4"} aria-hidden="true" />;
}
