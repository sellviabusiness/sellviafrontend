import type { HTMLAttributeReferrerPolicy } from "react"
import type { UiContainer, UiNode, UiNodeInputAttributes, UiText } from "@ory/client"
import { KeyRound, Mail } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert } from "@/components/ui/alert"
import { FormErrorText } from "@/components/ui/form-error-text"
import { PasswordInput } from "@/components/ui/password-input"
import { WebAuthnTriggerButton, WebAuthnOnLoadTrigger } from "./webauthn-trigger"

// Matches Input's own classes (input.tsx) — no shared export for this
// string, so duplicated here for the one native <select> case below.
const FIELD_CLASSES =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"

// Record, not a full mapped type: UiTextTypeEnum carries an OpenAPI
// "unknown value" fallback member alongside error/info/success, not worth
// naming here — MESSAGE_TONE.info covers it below.
const MESSAGE_TONE: Record<string, string> = {
  error: "text-destructive",
  info: "text-muted-foreground",
  success: "text-success",
}

// Kratos almost always supplies meta.label, but it's optional per the SDK
// type — a field rendered with no accessible name at all would be a real
// WCAG failure (4.1.2), so InputNode below always falls back to this rather
// than skipping the label. "traits.email" -> "Email", "password" -> "Password".
function humanizeFieldName(name: string): string {
  const last = name.split(".").pop() ?? name
  return last.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

// role="alert" (assertive, announces on change) — Kratos messages are
// exactly the kind of thing WCAG 4.1.3 (Status Messages) is about: a failed
// login/validation result the user needs to hear without hunting for it.
function Messages({ messages, id }: { messages?: UiText[]; id?: string }) {
  if (!messages?.length) return null
  return (
    <div id={id} role="alert" className="flex flex-col gap-1">
      {messages.map((m) =>
        m.type === "error" ? (
          <FormErrorText key={m.id}>{m.text}</FormErrorText>
        ) : (
          <p key={m.id} className={cn("text-sm", MESSAGE_TONE[m.type] ?? MESSAGE_TONE.info)}>
            {m.text}
          </p>
        )
      )}
    </div>
  )
}

// Top-of-form banner variant — request-level messages (invalid credentials,
// "check your email", "password reset — signed out everywhere else", ...)
// rather than a single field's own error. Playbook §2's FormErrorText "banner
// variant for request-level errors" (Docs/Frontend/Playbooks/01-authentication.md).
function MessageBanners({ messages }: { messages?: UiText[] }) {
  if (!messages?.length) return null
  return (
    <div className="flex flex-col gap-2">
      {messages.map((m) => (
        <Alert key={m.id} variant={m.type === "error" ? "error" : m.type === "success" ? "success" : "info"}>
          {m.text}
        </Alert>
      ))}
    </div>
  )
}

/** Mail icon for email fields, key icon for one-time codes — same pairing the reference playbook's forms use. */
function FieldIcon({ name, type }: { name: string; type: string }) {
  const iconClassName = "pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
  if (type === "email") return <Mail className={iconClassName} aria-hidden="true" />
  if (name.endsWith("code")) return <KeyRound className={iconClassName} aria-hidden="true" />
  return null
}

function InputNode({
  attributes,
  label,
  messages,
}: {
  attributes: UiNodeInputAttributes
  label?: UiText
  messages?: UiText[]
}) {
  // Runs whether this node is hidden, a button, or a real field — Kratos
  // puts onload_trigger (passkey conditional UI / autofill) on whichever
  // node type fits the method, not just inputs.
  const onLoad = attributes.onloadTrigger ? (
    <WebAuthnOnLoadTrigger trigger={attributes.onloadTrigger} />
  ) : null

  if (attributes.type === "hidden") {
    return (
      <>
        {onLoad}
        <input type="hidden" name={attributes.name} value={attributes.value ?? ""} />
      </>
    )
  }

  if (attributes.type === "submit" || attributes.type === "button") {
    // WebAuthn/passkey: clicking doesn't submit the form directly — it runs
    // Kratos's own trigger function, which performs the credential
    // ceremony and submits itself. See webauthn-trigger.tsx.
    if (attributes.onclickTrigger) {
      return (
        <>
          {onLoad}
          <WebAuthnTriggerButton
            trigger={attributes.onclickTrigger}
            label={label?.text ?? attributes.name}
            disabled={attributes.disabled}
          />
        </>
      )
    }
    return (
      <>
        {onLoad}
        <Button
          type={attributes.type}
          name={attributes.name}
          value={attributes.value ?? ""}
          disabled={attributes.disabled}
          // A multi-method flow (settings: password change + MFA together)
          // renders every method's fields in one <form> at once — a
          // `required` field belonging to a method the user isn't
          // submitting right now (e.g. "New password" empty while clicking
          // "Set up authenticator") would otherwise silently block the
          // browser's native validation from letting *any* submit through,
          // with no visible error. Kratos's own real UI has the same
          // multi-group-in-one-form shape and the same reason to disable
          // it: validation is Kratos's job server-side (returned as
          // ui.nodes messages, already rendered above), not the browser's.
          formNoValidate
        >
          {label?.text ?? attributes.name}
        </Button>
      </>
    )
  }

  const hasError = messages?.some((m) => m.type === "error") ?? false
  const messageId = messages?.length ? `${attributes.name}-messages` : undefined
  const fieldLabel = label?.text ?? humanizeFieldName(attributes.name)

  // Kratos flags an enum-constrained trait (e.g. a role picker, once the
  // identity schema defines one) with `options` — "clients should render
  // the field as a select/dropdown" per the SDK's own doc comment. Was
  // previously ignored entirely (always rendered a plain text input
  // regardless), which is the concrete blocker noted in the auth playbook
  // for B2's role selection: if/once Kratos's schema has a roles trait,
  // this is what makes it actually usable instead of a raw text box.
  if (attributes.options?.length) {
    return (
      <div className="flex flex-col gap-1.5">
        {onLoad}
        <Label htmlFor={attributes.name}>{fieldLabel}</Label>
        <select
          id={attributes.name}
          name={attributes.name}
          defaultValue={attributes.value != null ? String(attributes.value) : ""}
          required={attributes.required}
          disabled={attributes.disabled}
          aria-invalid={hasError}
          aria-describedby={messageId}
          className={FIELD_CLASSES}
        >
          {attributes.options.map((option) => (
            <option key={String(option.value)} value={String(option.value)}>
              {String(option.value)}
            </option>
          ))}
        </select>
        <Messages messages={messages} id={messageId} />
      </div>
    )
  }

  // Show/hide toggle — playbook §2's AuthFormField requirement for password
  // fields across Login/Register/Reset.
  if (attributes.type === "password") {
    return (
      <div className="flex flex-col gap-1.5">
        {onLoad}
        <PasswordInput
          id={attributes.name}
          name={attributes.name}
          label={fieldLabel}
          defaultValue={attributes.value ? String(attributes.value) : ""}
          required={attributes.required}
          disabled={attributes.disabled}
          autoComplete={attributes.autocomplete}
          aria-invalid={hasError}
          aria-describedby={messageId}
        />
        <Messages messages={messages} id={messageId} />
      </div>
    )
  }

  const hasIcon = attributes.type === "email" || attributes.name.endsWith("code")

  return (
    <div className="flex flex-col gap-1.5">
      {onLoad}
      <Label htmlFor={attributes.name}>{fieldLabel}</Label>
      <div className="relative">
        <FieldIcon name={attributes.name} type={attributes.type} />
        <Input
          id={attributes.name}
          name={attributes.name}
          type={attributes.type}
          defaultValue={attributes.value ?? ""}
          required={attributes.required}
          disabled={attributes.disabled}
          autoComplete={attributes.autocomplete}
          aria-invalid={hasError}
          aria-describedby={messageId}
          className={cn(hasIcon && "pl-8")}
        />
      </div>
      <Messages messages={messages} id={messageId} />
    </div>
  )
}

function FlowNode({ node }: { node: UiNode }) {
  const { attributes, messages, meta } = node

  switch (attributes.node_type) {
    case "input":
      return <InputNode attributes={attributes} label={meta.label} messages={messages} />
    case "text":
      return (
        <div className="flex flex-col gap-2">
          <MessageBanners messages={messages} />
          <p className="text-sm text-muted-foreground">{attributes.text?.text}</p>
        </div>
      )
    case "img":
      return (
        // eslint-disable-next-line @next/next/no-img-element -- Kratos serves this (e.g. TOTP QR code) as an opaque URL, not a static asset next/image can optimize
        <img src={attributes.src} width={attributes.width} height={attributes.height} alt={meta.label?.text ?? ""} />
      )
    case "a":
      return (
        <a
          href={attributes.href}
          className="rounded-xs text-sm text-primary underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {attributes.title?.text ?? meta.label?.text}
        </a>
      )
    case "script":
      // Loads Kratos's own WebAuthn/passkey JS bundle — the functions it
      // defines are what webauthn-trigger.tsx calls by name. Plain <script
      // src>, not next/script: this needs to run as part of the initial
      // SSR'd HTML for the ceremony to be triggerable at all, not lazy- or
      // strategy-loaded (next/script's optimizations are for content
      // scripts, not this).
      return (
        <script
          src={attributes.src}
          async={attributes.async}
          referrerPolicy={
            (attributes.referrerpolicy || undefined) as HTMLAttributeReferrerPolicy | undefined
          }
          crossOrigin={
            (attributes.crossorigin || undefined) as
              | "anonymous"
              | "use-credentials"
              | ""
              | undefined
          }
          integrity={attributes.integrity || undefined}
          nonce={attributes.nonce || undefined}
          type={attributes.type || undefined}
        />
      )
    default:
      return null
  }
}

/**
 * Renders any Kratos self-service flow (login/registration/recovery/
 * verification) generically from its self-describing `ui.nodes` — doesn't
 * hardcode which methods (password/oidc/code/passkey/...) are enabled, so it
 * doesn't need the contract sheet to be correct for whatever methods Kratos
 * is actually configured with.
 *
 * Submits as a native HTML form POST straight to `ui.action` (Kratos's
 * "browser flow" pattern) rather than an AJAX call through the SDK — the
 * SDK's per-method update calls (updateLoginFlow, etc.) need to know which
 * method body shape to send, which isn't knowable without the contract
 * sheet. Native submit works generically because every node — including
 * multiple method-specific submit buttons and the CSRF token — is already
 * just a plain input in `ui.nodes`; the browser handles the rest. Tradeoff:
 * full-page reload on submit instead of an in-place update: acceptable for a
 * scaffold, revisit once methods are confirmed.
 */
export function FlowForm({ ui }: { ui: UiContainer }) {
  return (
    <form action={ui.action} method={ui.method} className="flex flex-col gap-4">
      <MessageBanners messages={ui.messages} />
      {ui.nodes.map((node, i) => {
        const attrs = node.attributes as UiNodeInputAttributes
        // `name` alone isn't unique — a settings flow (password change +
        // MFA enrollment together) has multiple submit buttons all named
        // "method" (real Kratos does this too, one per group), so `value`
        // and the group both have to be part of the key too. `i` as a final
        // tiebreaker rather than the only key: node order can still shift
        // between renders (a field appearing/disappearing), and index-only
        // keys silently reuse the wrong element's state across that.
        const key = attrs.name ? `${node.group}-${attrs.name}-${attrs.type ?? ""}-${attrs.value ?? i}` : `node-${i}`
        return <FlowNode key={key} node={node} />
      })}
    </form>
  )
}
