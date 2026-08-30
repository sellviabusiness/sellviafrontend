import type { UiNode, UiNodeGroupEnum, UiNodeInputAttributesTypeEnum, UiText } from "@ory/client"

let nextMessageId = 1

export function uiText(text: string, type: UiText["type"] = "info"): UiText {
  return { id: nextMessageId++, text, type }
}

/** Builds a Kratos-shaped UiNode for a visible/hidden input field — mirrors what flow-form.tsx (the real renderer) expects. */
export function inputNode(opts: {
  name: string
  type?: UiNodeInputAttributesTypeEnum
  group?: UiNodeGroupEnum
  label?: string
  required?: boolean
  value?: string | boolean
  autoComplete?: string
  options?: { value: string; label?: string }[]
  messages?: UiText[]
}): UiNode {
  const { name, type = "text", group = "default", label, required, value, autoComplete, options, messages = [] } = opts
  return {
    type: "input",
    group,
    messages,
    meta: label ? { label: uiText(label) } : {},
    attributes: {
      node_type: "input",
      name,
      type,
      required,
      disabled: false,
      value,
      label: label ? uiText(label) : undefined,
      autocomplete: autoComplete as never,
      options: options?.map((o) => ({ value: o.value })),
    },
  }
}

export function submitNode(opts: { name?: string; value: string; label: string; group?: UiNodeGroupEnum }): UiNode {
  const { name = "method", value, label, group = "default" } = opts
  return {
    type: "input",
    group,
    messages: [],
    meta: { label: uiText(label) },
    attributes: { node_type: "input", name, type: "submit", required: false, disabled: false, value, label: uiText(label) },
  }
}

export function hiddenNode(name: string, value: string, group: UiNodeGroupEnum = "default"): UiNode {
  return {
    type: "input",
    group,
    messages: [],
    meta: {},
    attributes: { node_type: "input", name, type: "hidden", required: false, disabled: false, value },
  }
}

export function textNode(text: string, group: UiNodeGroupEnum = "default"): UiNode {
  return {
    type: "text",
    group,
    messages: [],
    meta: {},
    attributes: { node_type: "text", id: String(nextMessageId++), text: { id: nextMessageId++, text, type: "info" } },
  }
}

/** Returns a copy of `nodes` with an error message attached to the node named `fieldName`. */
export function withFieldError(nodes: UiNode[], fieldName: string, message: string): UiNode[] {
  return nodes.map((n) =>
    n.attributes.node_type === "input" && n.attributes.name === fieldName
      ? { ...n, messages: [uiText(message, "error")] }
      : n
  )
}

/** Re-applies previously submitted values so a re-rendered form (after a validation error) doesn't blank out what the user typed. */
export function withValues(nodes: UiNode[], values: Record<string, unknown>): UiNode[] {
  return nodes.map((n) => {
    if (n.attributes.node_type !== "input" || n.attributes.type === "password") return n
    const value = values[n.attributes.name]
    return value === undefined ? n : { ...n, attributes: { ...n.attributes, value: value as never } }
  })
}
