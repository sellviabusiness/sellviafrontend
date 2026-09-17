"use client";

import { Button } from "@/components/reference/ui/button";

/** Minimal brand marks — no icon-library dependency for two logos, same "cheapest thing that
 *  works" this codebase already follows for its inline-SVG charts. */
function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29a7.16 7.16 0 010-4.58V6.62H1.29a11.98 11.98 0 000 10.76l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.462 2.15-1.217 2.9-.78.78-2.06 1.37-3.02 1.29-.13-1.1.46-2.24 1.18-2.96.79-.8 2.17-1.4 3.06-1.23zM20.66 17.23c-.49 1.13-.72 1.63-1.35 2.63-.88 1.4-2.12 3.14-3.66 3.15-1.37.02-1.72-.9-3.58-.89-1.86.01-2.24.9-3.61.88-1.53-.02-2.71-1.59-3.6-2.99-2.47-3.87-2.73-8.41-1.2-10.83.99-1.57 2.6-2.51 4.1-2.51 1.54 0 2.5.85 3.77.85 1.24 0 1.98-.85 3.77-.85 1.28 0 2.65.7 3.63 1.91-3.19 1.75-2.68 6.32.75 8.65z" />
    </svg>
  );
}

export type OAuthProviderId = "google" | "apple";

/**
 * Shared "or continue with" row — used by both ClerkLoginForm and ClerkRegisterForm, since the
 * two buttons/icons/layout are identical; only what happens on click (signIn.sso vs signUp.sso,
 * and register's extra role-selection gate) differs per caller.
 */
export function OAuthButtons({
  onSelect,
  loadingProvider,
  disabled,
}: {
  onSelect: (provider: OAuthProviderId) => void;
  loadingProvider?: OAuthProviderId | null;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground-2">or continue with</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={disabled}
          loading={loadingProvider === "google"}
          onClick={() => onSelect("google")}
        >
          <GoogleIcon />
          Google
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={disabled}
          loading={loadingProvider === "apple"}
          onClick={() => onSelect("apple")}
        >
          <AppleIcon />
          Apple
        </Button>
      </div>
    </div>
  );
}
