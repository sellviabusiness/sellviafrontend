import type { ReactNode } from "react";

import { ReferenceThemeScope } from "@/components/reference/theme-scope";

// Applies the reference project's design tokens (globals.css's .reference-theme block) to this
// screen. STALE COMMENT FIX: this used to say the login screen "needs its own ThemeProvider" —
// ThemeProvider now lives once, at the true app root (src/app/layout.tsx, Playbook 09), so every
// route gets real theme context already; this scope only applies the `.reference-theme` class.
// No ThemeToggle is rendered on this screen — the toggle is dashboard-only (Playbook 10 §2).
export default function LoginLayout({ children }: { children: ReactNode }) {
  return <ReferenceThemeScope>{children}</ReferenceThemeScope>;
}
