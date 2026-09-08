/** Brief loading state while a step view reads its saved data from localStorage on mount. */
export function OnboardingSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="h-11 animate-pulse rounded-[var(--radius-sm)] bg-foreground/5" />
      <div className="h-11 animate-pulse rounded-[var(--radius-sm)] bg-foreground/5" />
      <div className="h-11 animate-pulse rounded-[var(--radius-sm)] bg-foreground/10" />
    </div>
  );
}
