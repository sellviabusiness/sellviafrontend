import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Buttons, neo-brutalist pass (2026-09-10): lime primary CTA (still used sparingly, still the
 * brand color — this redesign restyles the STRUCTURE, not the palette), thin-border secondary
 * upgraded to a 2px border + hard offset shadow, small radius, no gradients. Font is Bricolage
 * Grotesque (CTA typography). `border-2` sits on every variant (ghost's is transparent) so switching variants
 * never shifts a button's size. Primary/secondary get the "physical button" press: shadow
 * collapses and the button nudges into the space it vacated on `:active`, ghost stays flat (it's
 * the low-emphasis variant — everything doesn't need to feel tactile, just the real actions).
 */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] border-2 font-[family-name:var(--font-heading)] text-sm font-medium transition-[transform,box-shadow,opacity] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        primary:
          "border-border bg-accent text-accent-foreground shadow-brutal-sm hover:opacity-90 active:translate-x-[3px] active:translate-y-[3px] active:shadow-brutal-pressed",
        secondary:
          "border-border bg-card text-foreground shadow-brutal-sm hover:border-border-hover active:translate-x-[3px] active:translate-y-[3px] active:shadow-brutal-pressed",
        ghost: "border-transparent text-foreground hover:bg-foreground/5",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
