import { cn } from "@/lib/utils";

/** Heading + supporting line for every auth screen — one clear hierarchy, not a repeated one. */
export function AuthHeader({
  heading,
  subheading,
  className,
}: {
  heading: string;
  subheading?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 space-y-1", className)}>
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-foreground">
        {heading}
      </h1>
      {subheading && <p className="text-sm text-muted-foreground">{subheading}</p>}
    </div>
  );
}
