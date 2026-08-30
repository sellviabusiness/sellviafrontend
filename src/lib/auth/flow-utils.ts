import type { UiContainer, UiNode, UiText } from "@ory/client";

/** The subset every flow type (Login/Registration/Recovery/Verification/Settings) shares. */
export interface FlowLike {
  id: string;
  ui: UiContainer;
  state?: unknown;
}

/** Flow-level (not field-level) messages — rendered as a banner above the form. */
export function flowMessages(flow: FlowLike): UiText[] {
  return flow.ui.messages ?? [];
}

/**
 * Identity-schema and social-login nodes come back with dotted/grouped names (`traits.email`,
 * `password`, `csrf_token`). Native <form> + FormData gives us those as flat key/value pairs;
 * both providers' update-flow bodies expect `traits` (and similar) nested. This turns
 * `"traits.email" -> "a@b.com"` into `{ traits: { email: "a@b.com" } }`, merging everything else
 * at the top level, so the dynamic form never has to know the shape in advance.
 *
 * `submitter` MUST be passed when the form has more than one submit button (e.g. a
 * "Resend code" button alongside the main one) — without it, `FormData` has no way to know
 * which button was clicked, and the `method`/action name-value pair the provider needs to know
 * which strategy is being submitted would be silently missing. Pass `e.nativeEvent.submitter`
 * from the form's submit handler.
 */
export function nestedBodyFromForm(
  form: HTMLFormElement,
  submitter?: HTMLElement | null,
): Record<string, unknown> {
  const data = submitter ? new FormData(form, submitter) : new FormData(form);
  const body: Record<string, unknown> = {};

  for (const [key, value] of data.entries()) {
    const path = key.split(".");
    let cursor = body;
    for (let i = 0; i < path.length - 1; i++) {
      const segment = path[i];
      if (typeof cursor[segment] !== "object" || cursor[segment] === null) {
        cursor[segment] = {};
      }
      cursor = cursor[segment] as Record<string, unknown>;
    }
    const last = path[path.length - 1];
    if (last in cursor) {
      // Repeated field name (e.g. multiple checked checkboxes) — collect into an array
      // instead of the later value silently overwriting the earlier one.
      const existing = cursor[last];
      cursor[last] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      cursor[last] = value;
    }
  }

  return body;
}

/**
 * Social login (`oidc` group) is explicitly unresolved (Docs/Security/Authentication: provider
 * TBD) — we don't render it rather than ship a "Sign in with ..." button with no configured
 * provider behind it. Everything else a provider sends (password, code, link, profile/traits,
 * default/csrf) is rendered as-is.
 */
export function isRenderableGroup(group: UiNode["group"]): boolean {
  return group !== "oidc";
}

export function humanizeFieldName(name: string): string {
  const last = name.split(".").pop() ?? name;
  return last
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
