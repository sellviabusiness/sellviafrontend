import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

/**
 * Inline field-level error — the other half of the reference playbook's
 * "FormErrorText" requirement (§2), the banner half is alert.tsx. Plain text
 * only (no icon): the field it sits under already carries aria-invalid, this
 * is what aria-describedby points at.
 */
export function FormErrorText({ className, ...props }: ComponentProps<"p">) {
  return <p role="alert" className={cn("text-sm text-destructive", className)} {...props} />
}
