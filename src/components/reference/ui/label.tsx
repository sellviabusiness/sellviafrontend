import { forwardRef } from "react";
import type { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Real associated <label> — never placeholder-only (Docs/UX/Accessibility). */
export const Label = forwardRef<
  HTMLLabelElement,
  LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }
>(({ className, children, required, ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={cn(
        "text-sm font-medium text-foreground",
        className,
      )}
      {...props}
    >
      {children}
      {required && (
        <span aria-hidden="true" className="text-danger">
          {" "}
          *
        </span>
      )}
    </label>
  );
});
Label.displayName = "Label";
