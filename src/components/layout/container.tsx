import * as React from "react"

import { cn } from "@/lib/utils"

// Centers content and caps width at --container-max (globals.css), with gutters
// that widen as the viewport grows. Wrap page/section content in this, put
// <Grid> inside it for the 12-column layout.
function Container({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="container"
      className={cn(
        "mx-auto w-full max-w-(--container-max) px-4 sm:px-6 lg:px-8",
        className
      )}
      {...props}
    />
  )
}

export { Container }
