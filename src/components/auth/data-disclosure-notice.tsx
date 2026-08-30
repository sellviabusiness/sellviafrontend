// Grounded in Docs/Security/Data Inventory & Disclosure (read 2026-08-25,
// resolving playbooks/authentication-playbook.md's open question 5): the
// "Account identity" row of that doc's inventory table is exactly what this
// form collects — email, used for login/account identification, stored in
// Ory Kratos. Everything else in that table (Merchant/Creator profile
// fields, Paddle KYC, etc.) is collected later, in onboarding — out of scope
// here, so this notice doesn't claim anything about it.
//
// This is the "before, not after" disclosure principle from that doc,
// applied at the one collection point this form actually has — plain
// language, at the point of collection, not a ToS link-out. What it is NOT:
// the doc is explicit that its own content is "technically accurate, not
// legally reviewed" and that exact legal disclosure wording is deferred to
// end-of-build compliance review. This copy is accurate to what the form
// does; it isn't legally-reviewed language, and shouldn't be mistaken for it.
export function DataDisclosureNotice() {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      We use your email to create and secure your account (via Ory Kratos, our identity
      provider). Nothing else on this form is shared beyond what&apos;s needed to sign you up —
      profile details for your role are collected separately, later, when you set that up.
    </p>
  )
}
