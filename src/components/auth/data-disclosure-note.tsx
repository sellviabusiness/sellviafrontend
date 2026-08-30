/**
 * Plain-language, contextual data-disclosure note (Docs/Business Logic/User Flows §7.3 —
 * "short, contextual, timed notices woven into the relevant flow", not a buried ToS link).
 *
 * PLACEHOLDER COPY: Docs/Frontend/Playbooks/01-authentication.md §9 flags that the exact
 * legally-reviewed wording isn't sourced anywhere in Docs/ yet. This describes only what the
 * signup form itself visibly collects — it does not claim anything about downstream use
 * (AI matching, analytics, etc.) that isn't specified. Replace with reviewed copy before launch.
 */
export function DataDisclosureNote() {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground-2">
      We use your email and password to create and secure your account. No other information on
      this form is shared beyond what&apos;s needed to sign you up.
    </p>
  );
}
