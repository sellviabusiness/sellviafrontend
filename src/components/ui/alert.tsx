import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { CheckCircle2, CircleAlert, Info } from "lucide-react"

import { cn } from "@/lib/utils"

// Ported from the reference Authentication playbook's "FormErrorText —
// top-of-form banner variant for request-level errors" requirement
// (Docs/Frontend/Playbooks/01-authentication.md §2). Same tinted/10-bg +
// full-strength-text pattern as badge.tsx/button.tsx's destructive variant —
// kept consistent rather than introducing a new one.
const alertVariants = cva(
  "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        error: "border-destructive/20 bg-destructive/10 text-destructive",
        success: "border-success/20 bg-success/10 text-success",
        info: "border-info/20 bg-info/10 text-info",
      },
    },
    defaultVariants: { variant: "info" },
  }
)

const ICONS = { error: CircleAlert, success: CheckCircle2, info: Info }

function Alert({
  className,
  variant = "info",
  children,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  const Icon = ICONS[variant ?? "info"]
  return (
    <div data-slot="alert" role={variant === "error" ? "alert" : "status"} className={cn(alertVariants({ variant, className }))} {...props}>
      <Icon aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}

export { Alert, alertVariants }
