"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"

// Ory's documented client pattern for WebAuthn/passkey (public, not
// contract-territory — unlike which methods *this* Kratos instance actually
// has enabled, which is still unverified): a `script` node (see
// flow-form.tsx) loads Kratos's own JS bundle, which defines global
// functions named exactly like UiNodeInputAttributesOnclickTriggerEnum /
// OnloadTriggerEnum's values (oryWebAuthnLogin, oryPasskeyLogin, ...).
// Calling one runs the browser credential ceremony, fills the flow's hidden
// field, and submits the form itself — we don't submit manually here.
// Not testable against a live Kratos in this environment (ORY_SDK_URL is
// still a placeholder) — built to the documented contract, flag if it
// doesn't behave once there's a real instance to try it against.

function runTrigger(trigger: string) {
  const fn = (window as unknown as Record<string, unknown>)[trigger]
  if (typeof fn === "function") {
    ;(fn as () => void)()
  } else {
    console.error(
      `[webauthn] trigger "${trigger}" not found on window — Kratos's script node may not have finished loading yet.`
    )
  }
}

export function WebAuthnTriggerButton({
  trigger,
  label,
  disabled,
}: {
  trigger: string
  label: string
  disabled?: boolean
}) {
  return (
    <Button type="button" variant="outline" onClick={() => runTrigger(trigger)} disabled={disabled}>
      {label}
    </Button>
  )
}

/** Runs a trigger automatically once its script has mounted — e.g. passkey conditional UI (autofill). Renders nothing. */
export function WebAuthnOnLoadTrigger({ trigger }: { trigger: string }) {
  useEffect(() => {
    runTrigger(trigger)
  }, [trigger])
  return null
}
