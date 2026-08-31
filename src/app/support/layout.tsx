import type { ReactNode } from "react";
import { ReferenceThemeScope } from "@/components/reference/theme-scope";

/** Same reasoning as src/app/login/layout.tsx — /support is reachable from both dashboard
 *  shells (which are both reference-scoped) but sits outside either, so it needs its own scope
 *  rather than inheriting one. */
export default function SupportLayout({ children }: { children: ReactNode }) {
  return <ReferenceThemeScope>{children}</ReferenceThemeScope>;
}
