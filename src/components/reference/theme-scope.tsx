import type { ReactNode } from "react";

/**
 * Applies the reference project's design tokens (globals.css's .reference-theme block) to the
 * copied Authentication/Onboarding/Merchant/Creator screens.
 *
 * BUG FIX: used to also mount its own next-themes ThemeProvider here, once per route (10+
 * layout.tsx call sites) instead of once at the true app root. next-themes renders a real
 * `<script>` element as part of its React tree to set the theme class before hydration — mounted
 * anywhere other than the true root, that script becomes a normal mid-tree child on every
 * navigation, which is exactly the "Encountered a script tag while rendering React component"
 * console error this app kept hitting on every reference-styled page. It also meant /admin and
 * other layouts that never happened to wrap this component had no theme context at all, so their
 * ThemeToggle button was silently inert. Fixed by mounting ThemeProvider exactly once, in the true
 * root layout (src/app/layout.tsx) — every route gets real theme context for free now, this
 * component's only remaining job is the `.reference-theme` class.
 */
export function ReferenceThemeScope({ children }: { children: ReactNode }) {
  return <div className="reference-theme">{children}</div>;
}
