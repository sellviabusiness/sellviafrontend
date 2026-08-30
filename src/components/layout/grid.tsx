import * as React from "react"

import { cn } from "@/lib/utils"

// Responsive 12-column grid: 4 columns under md, 8 from md, full 12 from lg —
// standard collapse pattern so a 3-span column on desktop doesn't force a
// fraction-of-a-column on phones. Gap widens with the breakpoints (globals.css).
//
// Usage — size children with Tailwind's own col-span-* per breakpoint:
//   <Container>
//     <Grid>
//       <div className="col-span-4 lg:col-span-8">main</div>
//       <div className="col-span-4 lg:col-span-4">sidebar</div>
//     </Grid>
//   </Container>
function Grid({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="grid"
      className={cn(
        "grid grid-cols-4 gap-4 md:grid-cols-8 md:gap-6 lg:grid-cols-12 lg:gap-6",
        className
      )}
      {...props}
    />
  )
}

export { Grid }
