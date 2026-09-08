import type { ReactNode } from "react";

import { ReferenceThemeScope } from "@/components/reference/theme-scope";

// Added beyond the named scope (Authentication/Onboarding/Merchant): both
// onboarding's and merchant's layouts redirect here on completion / wrong
// role, so it's a hard runtime dependency, not an extra feature — without
// it those redirects 404. See src/app/login/layout.tsx for the theme-scope
// reasoning.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <ReferenceThemeScope>{children}</ReferenceThemeScope>;
}
