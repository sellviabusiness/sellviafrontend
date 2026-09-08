/**
 * Local stand-ins for the subset of `@ory/client`'s types this app's mock auth layer and
 * AuthFlowForm actually use. The app no longer talks to Ory Kratos (see lib/auth/config.ts —
 * the real provider is Clerk now, lib/auth/clerk/), but AuthFlowForm's generic node-driven
 * renderer and the mock provider that feeds it are still built around this exact shape — it's a
 * reasonable, self-describing UI contract on its own merits, not something worth rewriting for
 * its own sake. Defined here instead of importing `@ory/client` purely for its types so the
 * package itself (and the network client it ships) is gone from this app entirely, not just
 * unused.
 *
 * Field set matches exactly what mock/nodes.ts, mock/provider.ts, flow-utils.ts, and
 * auth-flow-form.tsx read/write — not a full reproduction of Ory's real schema.
 */

export interface UiText {
  id: number;
  text: string;
  type: "info" | "error" | "success";
}

export type UiNodeGroup = "default" | "password" | "code" | "totp" | "oidc" | "webauthn" | "link" | "lookup_secret" | "profile" | "passkey";

export interface UiNodeInputAttributes {
  node_type: "input";
  name: string;
  type: string;
  required?: boolean;
  disabled?: boolean;
  value?: string | boolean | number;
  label?: UiText;
  autocomplete?: string;
  maxlength?: number;
  pattern?: string;
  options?: { value: string | boolean | number }[];
  onloadTrigger?: string;
  onclickTrigger?: string;
}

export interface UiNodeTextAttributes {
  node_type: "text";
  id: string;
  text: UiText;
}

export type UiNodeAttributes = UiNodeInputAttributes | UiNodeTextAttributes;

export interface UiNode {
  type: "input" | "text";
  group: UiNodeGroup;
  attributes: UiNodeAttributes;
  messages: UiText[];
  meta: { label?: UiText };
}

export interface UiContainer {
  action: string;
  method: string;
  nodes: UiNode[];
  messages?: UiText[];
}

export interface Identity {
  id: string;
  schema_id: string;
  schema_url: string;
  traits: Record<string, unknown>;
  verifiable_addresses?: { value: string; verified: boolean; via: string; status: string }[];
}

export interface Session {
  id: string;
  identity?: Identity;
}

/** The shared shape every flow kind (login/registration/recovery/verification/settings) has. */
export interface Flow {
  id: string;
  expires_at: string;
  issued_at: string;
  request_url: string;
  state: string;
  type: string;
  ui: UiContainer;
  identity?: Identity;
}
