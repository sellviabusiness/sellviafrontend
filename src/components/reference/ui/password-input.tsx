"use client";

import { useId, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Input } from "./input";
import { Label } from "./label";
import { FormErrorText } from "./form-error-text";
import type { InputHTMLAttributes } from "react";

/**
 * Self-contained password field: label, lock icon, show/hide toggle, error text. Purely
 * presentational — still a real named <input> inside whatever <form> it's rendered in, so
 * submission (native FormData) is unaffected. Reused by AuthFlowForm for every `type=password`
 * node the active auth provider returns, and directly by ResetPasswordView for the client-only
 * "Confirm password" field.
 */
export function PasswordInput({
  label,
  errorText,
  invalid,
  id: idProp,
  ...props
}: {
  label: string;
  errorText?: string;
  invalid?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} required={props.required}>
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          icon={<Lock className="h-4 w-4" aria-hidden="true" />}
          invalid={invalid}
          aria-describedby={errorText ? errorId : undefined}
          className="pr-10"
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[8px] text-muted-foreground-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
      {errorText && <FormErrorText id={errorId}>{errorText}</FormErrorText>}
    </div>
  );
}
