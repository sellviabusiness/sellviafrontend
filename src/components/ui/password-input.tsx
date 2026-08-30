"use client"

import { useId, useState, type ComponentProps } from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Password field with a show/hide toggle — reference playbook §2 (AuthFormField)
 * called for this on every password field across Login/Register/Reset. Built
 * on this repo's own Input/Label (not a copy of the reference's), so it stays
 * visually identical to every other field flow-form.tsx renders.
 */
export function PasswordInput({
  id,
  label,
  className,
  ...props
}: ComponentProps<"input"> & { label: string; id?: string }) {
  const [visible, setVisible] = useState(false)
  const generatedId = useId()
  const fieldId = id ?? generatedId

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={fieldId}>{label}</Label>
      <div className="relative">
        <Input id={fieldId} type={visible ? "text" : "password"} className={cn("pr-8", className)} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground"
        >
          {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  )
}
