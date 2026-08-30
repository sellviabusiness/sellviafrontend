"use client";

import { useEffect, useId, useRef, useState, type SubmitEvent, type ReactNode } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { Session, UiNode, UiNodeInputAttributes } from "@ory/client";
import { KeyRound, Mail } from "lucide-react";
import { authProvider } from "@/lib/auth/provider";
import { classifyAuthError } from "@/lib/auth/errors";
import { flowMessages, nestedBodyFromForm, isRenderableGroup, humanizeFieldName } from "@/lib/auth/flow-utils";
import type { AnyFlow, FlowKind } from "@/lib/auth/types";
import { Button } from "@/components/reference/ui/button";
import { Input } from "@/components/reference/ui/input";
import { Label } from "@/components/reference/ui/label";
import { Alert } from "@/components/reference/ui/alert";
import { PasswordInput } from "@/components/reference/ui/password-input";
import { FormErrorText } from "@/components/reference/ui/form-error-text";
import { cn } from "@/lib/utils";

type ContinueWithLike = {
  action: string;
  redirect_browser_to?: string;
  flow?: { id: string };
};

/**
 * Generic self-service auth-flow form. Fetches the flow (by ?flow= id, or creates a new one)
 * from whichever AuthProvider is active (lib/auth/provider.ts — real Kratos or the local mock,
 * see Docs/Frontend/Playbooks/01-authentication.md §9.1), renders whatever UI nodes it returns,
 * and submits back through it. Shared by Login/Register/Forgot Password/Reset Password/Verify
 * Email so the fetch/submit/error-state logic exists exactly once and never has to know which
 * provider is behind it.
 */
export function AuthFlowForm({
  kind,
  returnTo,
  extraFields,
  onAuthenticated,
  onFlowLoaded,
  successBanner,
  allowFreshSettings = false,
}: {
  kind: FlowKind;
  returnTo?: string;
  /** Extra, non-flow form controls rendered just above the submit button (e.g. RoleSelector). */
  extraFields?: ReactNode;
  /** Called once the provider hands back an authenticated session (login, some registrations). */
  onAuthenticated?: (session: Session) => void;
  /** Called whenever a flow is (re)loaded — lets the page read e.g. flow.state. */
  onFlowLoaded?: (flow: AnyFlow) => void;
  /** Shown instead of the form once the flow reaches a terminal success state with nothing left to do. */
  successBanner?: (flow: AnyFlow) => ReactNode;
  /**
   * B5 — `kind="settings"` has two different valid entry points that both land here with no
   * `?flow=`: reset-password (arrived cold, no session, expects a *recovery-link* flow id —
   * missing one really does mean a dead/mistyped link, keep showing that message) vs
   * /account/security (arrived already authenticated, no flow id *by design* — wants a fresh
   * settings flow, now supported by createFlow). Only the latter should set this true.
   */
  allowFreshSettings?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const formId = useId();

  const [flow, setFlow] = useState<AnyFlow | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "submitting" | "unreachable" | "not-configured">(
    authProvider.isConfigured() ? "loading" : "not-configured",
  );
  const [bannerError, setBannerError] = useState<string | null>(null);
  // B4 — true only for classifyAuthError's "expired" kind specifically (a dead flow/link/code),
  // not any other failure. Drives the "Request a new one" action below — distinct from a wrong
  // code (which stays inline, form still up) or an unreachable-provider message (nothing to
  // "request again", the provider itself isn't answering).
  const [isExpired, setIsExpired] = useState(false);
  const loadedFlowId = useRef<string | null>(null);

  const flowIdParam = searchParams.get("flow");
  // No token/flow to resume — this only happens via a stale/invalid recovery link. Computed
  // during render (not set as state from an effect) since it needs no network round trip.
  const missingSettingsToken = kind === "settings" && !flowIdParam && !allowFreshSettings;

  useEffect(() => {
    if (!authProvider.isConfigured() || missingSettingsToken) return;

    const flowId = flowIdParam;
    if (loadedFlowId.current === (flowId ?? "new")) return;
    loadedFlowId.current = flowId ?? "new";

    setStatus("loading");
    setBannerError(null);
    setIsExpired(false);

    const load = flowId ? authProvider.getFlow(kind, flowId) : authProvider.createFlow(kind, returnTo);
    load
      .then((f) => {
        setFlow(f);
        onFlowLoaded?.(f);
        setStatus("ready");
      })
      .catch((err) => {
        const classified = classifyAuthError(err);
        if (classified.kind === "flow") {
          setFlow(classified.flow as AnyFlow);
          setStatus("ready");
        } else if (classified.kind === "expired" || classified.kind === "message") {
          setBannerError(classified.message);
          setIsExpired(classified.kind === "expired");
          setStatus("unreachable");
        } else {
          setStatus("unreachable");
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed off flow id only
  }, [kind, flowIdParam, missingSettingsToken, returnTo]);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!flow) return;
    setStatus("submitting");
    setBannerError(null);

    const body = nestedBodyFromForm(e.currentTarget, e.nativeEvent.submitter);

    try {
      const rawResult = await authProvider.updateFlow(kind, flow.id, body);
      const result = rawResult as Record<string, unknown>;

      const continueWith = (result.continue_with as ContinueWithLike[] | undefined) ?? [];
      for (const action of continueWith) {
        if (action.action === "redirect_browser_to" && action.redirect_browser_to) {
          window.location.href = action.redirect_browser_to;
          return;
        }
        if (action.action === "show_settings_ui" && action.flow) {
          router.push(`/reset-password?flow=${action.flow.id}`);
          return;
        }
        if (action.action === "show_verification_ui" && action.flow) {
          router.push(`/verify-email?flow=${action.flow.id}`);
          return;
        }
        if (action.action === "show_recovery_ui" && action.flow) {
          router.push(`/forgot-password?flow=${action.flow.id}`);
          return;
        }
      }

      if ("session" in result && result.session) {
        const session = result.session as Session;
        await authProvider.onAuthenticated(session);
        onAuthenticated?.(session);
        return;
      }

      const updatedFlow = result as unknown as AnyFlow;
      if (kind === "verification" && updatedFlow.state === "passed_challenge") {
        await authProvider.onVerified();
      }

      // Otherwise: an updated flow (new state, e.g. "sent_email", or a settings flow that's
      // now "success") — re-render with it rather than treating this as an error.
      setFlow(updatedFlow);
      onFlowLoaded?.(updatedFlow);
      setStatus("ready");
    } catch (err) {
      const classified = classifyAuthError(err);
      if (classified.kind === "flow") {
        setFlow(classified.flow as AnyFlow);
        setStatus("ready");
      } else if (classified.kind === "expired") {
        // B4 — the provider already deleted this flow server-side (a code that outlived
        // CODE_TTL_MS, e.g.) — the stale in-memory `flow` here can't be resubmitted
        // successfully either way, so drop it and route through the same expired-state
        // render (below) as a dead flow discovered on initial load, rather than leaving a
        // form up that will just 410 again.
        setFlow(null);
        setBannerError(classified.message);
        setIsExpired(true);
        setStatus("unreachable");
      } else if (classified.kind === "message") {
        setBannerError(classified.message);
        setStatus("ready");
      } else {
        setBannerError("Can't reach the identity service right now. Please try again shortly.");
        setStatus("ready");
      }
    }
  }

  function restart() {
    setIsExpired(false);
    setBannerError(null);
    loadedFlowId.current = null;
    router.replace(pathname);
  }

  if (status === "not-configured") {
    return (
      <Alert variant="error">
        Sign-in isn&apos;t configured yet — <code>NEXT_PUBLIC_ORY_KRATOS_URL</code> is missing.
        Set it in <code>.env.local</code> and restart the dev server.
      </Alert>
    );
  }

  if (missingSettingsToken) {
    return (
      <div className="space-y-4">
        <Alert variant="error">This link is invalid or has expired.</Alert>
        <Button type="button" variant="secondary" className="w-full" onClick={() => router.push("/forgot-password")}>
          Request a new one
        </Button>
      </div>
    );
  }

  if (status === "loading") {
    return <FormSkeleton />;
  }

  if (status === "unreachable" && !flow) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{bannerError ?? "Can't reach the identity service right now. Please try again shortly."}</Alert>
        {/* B4 — "settings" excluded on purpose: it's the one kind that can't be freshly
            created (needs a privileged/recovery-linked session, see createFlow) — its own
            dead-link message (missingSettingsToken above) already points back to
            /forgot-password instead. */}
        {isExpired && kind !== "settings" && (
          <Button type="button" variant="secondary" className="w-full" onClick={restart}>
            Request a new one
          </Button>
        )}
      </div>
    );
  }

  if (!flow) return null;

  const successNode = successBanner?.(flow);
  if (successNode) return <>{successNode}</>;

  const messages = flowMessages(flow);
  const nodes = flow.ui.nodes.filter((n) => isRenderableGroup(n.group));

  return (
    <form
      id={formId}
      action={flow.ui.action}
      method={flow.ui.method || "POST"}
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4"
    >
      {bannerError && <Alert variant="error">{bannerError}</Alert>}
      {messages.map((m) => (
        <Alert key={m.id} variant={m.type === "success" ? "success" : m.type === "info" ? "info" : "error"}>
          {m.text}
        </Alert>
      ))}

      {nodes.map((node, i) => (
        <FlowNode key={nodeKey(node, i)} node={node} />
      ))}

      {extraFields}

      <SubmitButtons nodes={nodes} submitting={status === "submitting"} />
    </form>
  );
}

function nodeKey(node: UiNode, index: number) {
  const attrs = node.attributes as UiNodeInputAttributes;
  return `${node.group}-${attrs?.name ?? index}-${attrs?.value ?? ""}`;
}

function FlowNode({ node }: { node: UiNode }) {
  if (node.attributes.node_type !== "input") {
    if (node.attributes.node_type === "text") {
      return <p className="text-sm text-muted-foreground">{node.attributes.text?.text}</p>;
    }
    return null;
  }

  const attrs = node.attributes;
  const errors = node.messages?.filter((m) => m.type === "error") ?? [];
  const hasError = errors.length > 0;

  if (attrs.type === "hidden") {
    return <input type="hidden" name={attrs.name} value={String(attrs.value ?? "")} />;
  }

  if (attrs.type === "submit" || attrs.type === "button") {
    // Rendered together in SubmitButtons, once, in original order.
    return null;
  }

  const fieldId = `field-${attrs.name}`;
  const errorId = `${fieldId}-error`;
  const label = attrs.label?.text ?? node.meta?.label?.text ?? humanizeFieldName(attrs.name);

  if (attrs.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name={attrs.name}
          defaultChecked={Boolean(attrs.value)}
          disabled={attrs.disabled}
          required={attrs.required}
          className="h-4 w-4 rounded-sm border-border accent-[color:var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? errorId : undefined}
        />
        {label}
        {hasError && (
          <span id={errorId} className="sr-only">
            {errors.map((e) => e.text).join(". ")}
          </span>
        )}
      </label>
    );
  }

  const errorText = hasError ? errors.map((e) => e.text).join(". ") : undefined;

  if (attrs.type === "password") {
    return (
      <PasswordInput
        id={fieldId}
        name={attrs.name}
        label={label}
        defaultValue={attrs.value != null ? String(attrs.value) : undefined}
        disabled={attrs.disabled}
        required={attrs.required}
        autoComplete={attrs.autocomplete}
        invalid={hasError}
        errorText={errorText}
      />
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId} required={attrs.required}>
        {label}
      </Label>
      <Input
        id={fieldId}
        name={attrs.name}
        type={attrs.type}
        icon={fieldIcon(attrs.name, attrs.type)}
        defaultValue={attrs.value != null ? String(attrs.value) : undefined}
        disabled={attrs.disabled}
        required={attrs.required}
        autoComplete={attrs.autocomplete}
        maxLength={attrs.maxlength}
        pattern={attrs.pattern}
        invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
      />
      {hasError && <FormErrorText id={errorId}>{errorText!}</FormErrorText>}
    </div>
  );
}

function fieldIcon(name: string, type: string) {
  if (type === "email") return <Mail className="h-4 w-4" aria-hidden="true" />;
  if (name.endsWith("code")) return <KeyRound className="h-4 w-4" aria-hidden="true" />;
  return undefined;
}

function SubmitButtons({ nodes, submitting }: { nodes: UiNode[]; submitting: boolean }) {
  const submits = nodes.filter(
    (n) => n.attributes.node_type === "input" && (n.attributes as UiNodeInputAttributes).type === "submit",
  );

  if (submits.length === 0) {
    return (
      <Button type="submit" loading={submitting} className="w-full">
        {submitting ? "Please wait…" : "Continue"}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 pt-1">
      {submits.map((node, i) => {
        const attrs = node.attributes as UiNodeInputAttributes;
        const label = attrs.label?.text ?? node.meta?.label?.text ?? "Continue";
        return (
          <Button
            key={`${attrs.name}-${attrs.value}`}
            type="submit"
            name={attrs.name}
            value={String(attrs.value ?? "")}
            variant={i === 0 ? "primary" : "secondary"}
            loading={submitting}
            className={cn("w-full")}
          >
            {submitting ? "Please wait…" : label}
          </Button>
        );
      })}
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="h-11 animate-pulse rounded-[var(--radius-sm)] bg-foreground/5" />
      <div className="h-11 animate-pulse rounded-[var(--radius-sm)] bg-foreground/5" />
      <div className="h-11 animate-pulse rounded-[var(--radius-sm)] bg-foreground/10" />
    </div>
  );
}
