import type { ReactNode } from "react";

import { ReferenceThemeScope } from "@/components/reference/theme-scope";

// See src/app/login/layout.tsx for why this exists.
export default function VerifyEmailLayout({ children }: { children: ReactNode }) {
  return <ReferenceThemeScope>{children}</ReferenceThemeScope>;
}
